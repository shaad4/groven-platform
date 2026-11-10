import uuid

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.notifications.tasks import (send_password_reset_email,
                                      send_verification_email)
from apps.tenants.models import Tenant, TenantMembership

from .models import User
from .repositories import EmailVerificationTokenRepository, UserRepository
from .serializers import (EmailNotVerified, ForgotPasswordSerializer,
                          GoogleAuthSerializer, LoginSerializer,
                          ProviderSignupSerializer, ResetPasswordSerializer,
                          WorkspaceSetupSerializer)
from .services import (InvalidOrExpiredToken, NoProviderMembership,
                       PasswordResetService, ProviderLoginService,
                       ProviderSignupService)
from .utils import set_auth_cookies


# Helpers
def _build_user_payload(user, membership):
    """
    Build the standard user object returned in every auth response
    """

    payload = {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }
    if membership:
        payload["role"] = membership.role

    return payload


def _build_tenant_payload(tenant):
    if tenant is None:
        return None
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "logo_url": tenant.logo_url,
        "accent_color": tenant.accent_color,
        "tagline": tenant.tagline,
        "plan": {
            "id": str(tenant.plan.id),
            "name": tenant.plan.name,
            "client_limit": tenant.plan.client_limit,
            "request_limit": tenant.plan.request_limit,
            "price_monthly": str(tenant.plan.price_monthly),
        },
        "is_pro": tenant.is_pro,
    }


class RefreshTokenView(APIView):
    # A stale access header must not prevent validating the refresh cookie.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        tenant = getattr(request, "tenant", None)

        if tenant:
            refresh_token = request.COOKIES.get(
                f"client_refresh_{tenant.slug}"
            ) or request.COOKIES.get(f"provider_refresh_{tenant.slug}")
        else:
            slug_hint = request.data.get("slug")
            if slug_hint:
                try:
                    t = Tenant.objects.get(slug=slug_hint, is_active=True)
                    refresh_token = request.COOKIES.get(
                        f"client_refresh_{t.slug}"
                    ) or request.COOKIES.get(f"provider_refresh_{t.slug}")
                except Tenant.DoesNotExist:
                    refresh_token = None
            else:
                refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"success": False, "message": "No refresh token found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            return Response({"success": True, "access": access_token})
        except Exception:
            return Response(
                {"success": False, "message": "Invalid or expired session."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class ProviderSignupView(APIView):
    """
    POST /api/auth/register/
    Creates a tenant + provider user in one atomic transaction.
    """

    permission_classes = [AllowAny]
    # throttle_classes = "signup"

    def post(self, request):
        serializer = ProviderSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ProviderSignupService.register(**serializer.validated_data)

        send_verification_email.delay(
            user_email=result["user"].email,
            display_name=result["user"].display_name,
            token=str(result["verification_token"].token),
        )

        return Response(
            {
                "success": True,
                "message": "Verification email sent.",
                "data": {
                    "email": result["user"].email,
                    "requires_verification": True,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("token")

        if not raw:
            return Response(
                {"success": False, "message": "Token required."}, status=400
            )

        try:
            token_value = uuid.UUID(raw)
        except ValueError:
            return Response(
                {"success": False, "message": "Invalid token format"}, status=400
            )

        try:
            result = ProviderSignupService.verify_email(token_value=token_value)
        except InvalidOrExpiredToken as e:
            return Response({"success": False, "message": str(e)}, status=400)

        user = result["user"]

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "success": True,
                "message": "Email verified. Please set up your workspace.",
                "data": {
                    "access": str(refresh.access_token),
                    "user": _build_user_payload(user, membership=None),
                    "tenant": None,
                    "needs_workspace": True,
                },
            }
        )

        set_auth_cookies(response, refresh)

        return response


class WorkspaceSetupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WorkspaceSetupSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = request.user

        already_provider = TenantMembership.objects.filter(
            user=user,
            role=TenantMembership.Role.PROVIDER,
            is_active=True,
        ).exists()

        if already_provider:
            return Response(
                {"success": False, "message": "Workspace already exists."},
                status=400,
            )

        result = ProviderSignupService.setup_workspace(
            user=user,
            buisness_name=serializer.validated_data["business_name"],
            slug=serializer.validated_data["slug"],
        )

        tenant = result["tenant"]
        membership = result["membership"]

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "success": True,
                "message": "Workspace created successfully.",
                "data": {
                    "access": str(refresh.access_token),
                    "user": _build_user_payload(user, membership),
                    "tenant": _build_tenant_payload(tenant),
                },
            }
        )

        set_auth_cookies(
            response, refresh, cookie_name=f"provider_refresh_{tenant.slug}"
        )

        return response


class CheckSlugAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        slug = request.query_params.get("slug", "").lower().strip()

        if not slug:
            return Response(
                {"available": False, "message": "Slug is required"}, status=400
            )

        exists = Tenant.objects.filter(slug=slug, is_active=True).exists()

        return Response({"available": not exists})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except EmailNotVerified as e:
            user = e.user
            # Expire old token

            token = EmailVerificationTokenRepository.create(
                user=user, expires_at=timezone.now() + timezone.timedelta(minutes=30)
            )

            EmailVerificationTokenRepository.expire_others(user=user, keep_id=token.id)

            send_verification_email.delay(
                user_email=user.email,
                display_name=user.display_name,
                token=str(token.token),
            )

            return Response(
                {
                    "success": False,
                    "code": "email_not_verified",
                    "message": "Your email isn't verified. We've sent a new verification link.",
                },
                status=400,
            )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]
        tenant = getattr(request, "tenant", None)

        # Workspace login (subdomain)
        if tenant is not None:
            # Try provider first, then client
            membership = TenantMembership.objects.filter(
                user=user,
                tenant=tenant,
                is_active=True,
            ).first()

            if membership is None:
                return Response(
                    {
                        "success": False,
                        "message": "No account found for this workspace.",
                    },
                    status=400,
                )

            update_last_login(None, user)
            refresh = RefreshToken.for_user(user)

            response = Response(
                {
                    "success": True,
                    "access": str(refresh.access_token),
                    "user": _build_user_payload(user, membership),
                    "tenant": _build_tenant_payload(tenant),
                    "membership_count": 1,  # workspace login always goes direct, no picker
                }
            )
            cookie_name = (
                f"provider_refresh_{tenant.slug}"
                if membership.role == TenantMembership.Role.PROVIDER
                else f"client_refresh_{tenant.slug}"
            )
            set_auth_cookies(response, refresh, cookie_name=cookie_name)
            return response

        # Global login (root domain)
        memberships = TenantMembership.objects.filter(
            user=user,
            is_active=True,
        ).select_related("tenant")

        membership_count = memberships.count()

        if membership_count == 0:
            # Verified user but no workspace yet — needs setup
            refresh = RefreshToken.for_user(user)
            response = Response(
                {
                    "success": True,
                    "access": str(refresh.access_token),
                    "needs_workspace": True,
                    "user": _build_user_payload(user, None),
                    "tenant": None,
                    "membership_count": 0,
                }
            )
            set_auth_cookies(response, refresh)
            return response

        # Pick the primary membership to build user payload
        # Prefer provider role so a user who is both lands on their workspace
        primary = (
            memberships.filter(role=TenantMembership.Role.PROVIDER).first()
            or memberships.first()
        )
        primary_tenant = primary.tenant if membership_count == 1 else None

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)

        cookie_name = (
            f"provider_refresh_{primary.tenant.slug}"
            if primary.role == TenantMembership.Role.PROVIDER
            else f"client_refresh_{primary.tenant.slug}"
        )

        response = Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "user": _build_user_payload(user, primary),
                "tenant": _build_tenant_payload(primary_tenant),
                "membership_count": membership_count,
            }
        )

        for m in memberships:
            slug = m.tenant.slug
            role_prefix = (
                "provider" if m.role == TenantMembership.Role.PROVIDER else "client"
            )
            set_auth_cookies(
                response, refresh, cookie_name=f"{role_prefix}_refresh_{slug}"
            )

        set_auth_cookies(response, refresh, cookie_name="refresh_token")

        return response


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = PasswordResetService.request_reset(
            email=serializer.validated_data["email"]
        )

        if result:
            send_password_reset_email.delay(
                user_email=result["user"].email,
                display_name=result["user"].display_name,
                token=str(result["reset_token"].token),
            )

        return Response(
            {
                "success": True,
                "message": "If this email is registered, a reset link has been sent.",
            }
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            PasswordResetService.confirm_reset(
                token_value=serializer.validated_data["token"],
                new_password=serializer.validated_data["password"],
            )
        except InvalidOrExpiredToken as e:
            return Response({"success": False, "message": str(e)}, status=400)

        return Response({"success": True, "message": "Password reset successfully."})


class MeView(APIView):
    """
    Returns the current user + their membership in the active tenant
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user
        membership = getattr(request, "tenant_membership", None)
        tenant = getattr(request, "tenant", None)

        if membership is None and tenant is not None:
            return Response(
                {
                    "success": False,
                    "message": "No active membership found for this workspace.",
                },
                status=403,
            )

        if membership is None and tenant is None:
            membership = (
                TenantMembership.objects.filter(
                    user=user,
                    is_active=True,
                )
                .select_related("tenant")
                .order_by("-role")
                .first()
            )
            if membership:
                tenant = membership.tenant

        return Response(
            {
                "user": _build_user_payload(user, membership),
                "tenant": _build_tenant_payload(tenant),
            }
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        # Blacklist any available refresh token
        all_tokens = []

        for key, value in request.COOKIES.items():

            if (
                key == "refresh_token"
                or key.startswith("provider_refresh_")
                or key.startswith("client_refresh_")
            ):
                all_tokens.append(value)

        for token in all_tokens:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                pass

        response = Response({"success": True, "message": "Logged Out."})

        # Delete ALL auth cookies
        for key in request.COOKIES.keys():

            if (
                key == "refresh_token"
                or key.startswith("provider_refresh_")
                or key.startswith("client_refresh_")
            ):

                response.delete_cookie(
                    key,
                    domain=settings.COOKIE_DOMAIN,
                    path="/",
                )

        return response


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_data = serializer.validated_data["access_token"]
        email = google_data["email"]

        existing = UserRepository.get_by_email(email)

        if existing:
            if not existing.is_active:
                return Response(
                    {"success": False, "message": "This account has been deactivated."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            user = existing

            if not user.is_email_verified:
                user.is_email_verified = True
                user.is_active = True
            if not user.avatar_url and google_data.get("avatar_url"):
                user.avatar_url = google_data["avatar_url"]
            user.save()
        else:
            user = User(
                email=email,
                display_name=google_data["display_name"],
                avatar_url=google_data.get("avatar_url"),
                is_active=True,
                is_email_verified=True,
            )
            user.set_unusable_password()
            user.save()

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)

        # Check if this user has a provider workspace yet
        provider_membership = (
            TenantMembership.objects.filter(
                user=user,
                role=TenantMembership.Role.PROVIDER,
            )
            .select_related("tenant")
            .first()
        )

        membership_count = TenantMembership.objects.filter(
            user=user,
            is_active=True,
        ).count()

        needs_workspace = provider_membership is None
        tenant = provider_membership.tenant if provider_membership else None

        response = Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "needs_workspace": needs_workspace,
                "user": _build_user_payload(user, provider_membership),
                "tenant": _build_tenant_payload(tenant),
                "membership_count": membership_count,
            }
        )

        if tenant:
            # Single provider — one cookie
            set_auth_cookies(
                response, refresh, cookie_name=f"provider_refresh_{tenant.slug}"
            )
        else:
            # Multiple memberships — set a cookie per tenant, same pattern as LoginView
            all_memberships = TenantMembership.objects.filter(
                user=user, is_active=True
            ).select_related("tenant")
            for m in all_memberships:
                role_prefix = (
                    "provider" if m.role == TenantMembership.Role.PROVIDER else "client"
                )
                set_auth_cookies(
                    response,
                    refresh,
                    cookie_name=f"{role_prefix}_refresh_{m.tenant.slug}",
                )
            set_auth_cookies(response, refresh, cookie_name="refresh_token")

        return response


class MembershipsView(APIView):
    """
    GET /auth/memberships/

    Returns all portals the logged-in user belongs to,
    split by role. Used by groven.in/portals picker screen
    and the portal switcher component.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        memberships = TenantMembership.objects.filter(
            user=request.user, is_active=True
        ).select_related("tenant", "tenant__plan")

        provider_portals = []
        client_portals = []

        for m in memberships:
            portal = {
                "tenant_name": m.tenant.name,
                "tenant_slug": m.tenant.slug,
                "tenant_logo": m.tenant.logo_url,
                "is_suspended": m.tenant.is_suspended,
            }
            if m.role == TenantMembership.Role.PROVIDER:
                provider_portals.append(portal)
            else:
                client_portals.append(portal)

        return Response(
            {
                "provider_portals": provider_portals,
                "client_portals": client_portals,
            }
        )
