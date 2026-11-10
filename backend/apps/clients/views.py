from django.contrib.auth.models import update_last_login
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.notifications.tasks import send_password_reset_email
from apps.tenants.models import TenantMembership
from apps.users.repositories import UserRepository
from apps.users.services import InvalidOrExpiredToken, PasswordResetService
from apps.users.utils import set_auth_cookies

from .models import Client
from .repositories import ClientRepository, InviteRepository
from .serializers import (AcceptInviteSerializer, AddClientSerializer,
                          ClientDetailSerializer,
                          ClientForgotPasswordSerializer, ClientListSerializer,
                          ClientResetPasswordSerializer,
                          UpdateClientSerializer)
from .services import (CannotResendToActiveClient, ClientAlreadyDeactivated,
                       ClientLimitExceeded, ClientNotDeactivated,
                       ClientNotFound, ClientService, DuplicateClientEmail,
                       ExpiredInviteToken, InvalidInviteToken,
                       PendingInviteExists)
from .tasks import send_client_invite_email


def _require_provider(request):
    membership = getattr(request, "tenant_membership", None)
    return membership is not None and membership.role == TenantMembership.Role.PROVIDER


class ClientListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        clients = ClientRepository.get_all_for_tenant(request.tenant.id)
        serializer = ClientListSerializer(clients, many=True)

        return Response(
            {
                "success": True,
                "data": {
                    "clients": serializer.data,
                    "total": clients.count(),
                },
            }
        )

    def post(self, request):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response(
                {"success": False, "message": "Invalid workspace."}, status=400
            )

        serializer = AddClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = ClientService.invite_client(
                tenant=tenant,
                provider=request.user,
                client_name=serializer.validated_data["client_name"],
                client_email=serializer.validated_data["client_email"],
                business_type=serializer.validated_data.get("business_type") or None,
                private_note=serializer.validated_data.get("private_note") or None,
                tags=serializer.validated_data.get("tags") or [],
            )
        except ClientLimitExceeded as e:
            return Response(
                {
                    "success": False,
                    "error_type": "limit_reached",
                    "message": str(e),
                },
                status=403,
            )
        except DuplicateClientEmail as e:
            return Response(
                {
                    "success": False,
                    "error_type": "duplicate_client",
                    "message": str(e),
                },
                status=409,
            )
        except PendingInviteExists as e:
            return Response(
                {
                    "success": False,
                    "error_type": "pending_invite",
                    "message": str(e),
                },
                status=409,
            )

        invite = result["invite"]

        send_client_invite_email.delay(
            client_email=invite.client_email,
            client_name=invite.client_name,
            provider_name=request.user.display_name,
            tenant_slug=tenant.slug,
            invite_token=str(invite.token),
        )

        return Response(
            {
                "success": True,
                "message": f"Invite sent to {invite.client_email}.",
                "data": {
                    "email": invite.client_email,
                    "name": invite.client_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden"}, status=403)
        client = ClientRepository.get_by_id(client_id, request.tenant.id)
        if not client:
            return Response(
                {"success": False, "message": "Client not found."}, status=404
            )
        return Response({"success": True, "data": ClientDetailSerializer(client).data})

    def patch(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)
        serializer = UpdateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            client = ClientService.update_client(
                client_id=client_id,
                tenant=request.tenant,
                business_type=serializer.validated_data.get("business_type"),
                private_note=serializer.validated_data.get("private_note"),
                tags=serializer.validated_data.get("tags"),
            )
        except ClientNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response(
            {
                "success": True,
                "message": "Client updated.",
                "data": ClientDetailSerializer(client).data,
            }
        )

    def delete(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)
        try:
            ClientService.delete_client(client_id=client_id, tenant=request.tenant)
        except ClientNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response({"success": True, "message": "Client deleted."})


class ClientDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)
        try:
            ClientService.deactivate_client(client_id=client_id, tenant=request.tenant)
        except ClientNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except ClientAlreadyDeactivated as e:
            return Response({"success": False, "message": str(e)}, status=409)
        return Response({"success": True, "message": "Client deactivated."})


class ClientReactivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)
        try:
            ClientService.reactivate_client(client_id=client_id, tenant=request.tenant)
        except ClientNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except ClientNotDeactivated as e:
            return Response({"success": False, "message": str(e)}, status=409)
        return Response({"success": True, "message": "Client reactivated."})


class ClientResendInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)
        try:
            result = ClientService.resend_invite(
                client_id=client_id,
                tenant=request.tenant,
                provider=request.user,
            )
        except ClientNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except CannotResendToActiveClient as e:
            return Response({"success": False, "message": str(e)}, status=409)

        invite = result["invite"]
        send_client_invite_email.delay(
            client_email=invite.client_email,
            client_name=invite.client_name,
            provider_name=request.user.display_name,
            tenant_slug=request.tenant.slug,
            invite_token=str(invite.token),
        )
        return Response({"success": True, "message": "Invite resent."})


class ValidateInviteTokenView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")

        if not token:
            return Response(
                {"valid": False, "message": "Token is required."}, status=400
            )

        invite = InviteRepository.get_pending_by_token(token)

        if not invite:
            return Response(
                {
                    "valid": False,
                    "message": "This invite link is invalid or has already been used.",
                },
                status=400,
            )

        if invite.expires_at < timezone.now():
            return Response(
                {
                    "valid": False,
                    "message": "This invite link has expired. Ask your provider to resend it.",
                },
                status=400,
            )

        already_has_account = UserRepository.email_exists(invite.client_email)

        return Response(
            {
                "valid": True,
                "data": {
                    "client_name": invite.client_name,
                    "client_email": invite.client_email,
                    "provider_name": invite.provider.display_name,
                    "workspace_name": invite.tenant.name,
                    "tenant_slug": invite.tenant.slug,
                    "already_has_account": already_has_account,
                },
            }
        )


class AcceptInviteView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = ClientService.accept_invite(
                token=str(serializer.validated_data["token"]),
                password=serializer.validated_data.get("password"),
            )
        except InvalidInviteToken as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except ExpiredInviteToken as e:
            return Response({"success": False, "message": str(e)}, status=400)

        user = result["user"]
        tenant = result["tenant"]
        membership = result.get("membership")

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "success": True,
                "message": "Account activated. Welcome to Groven!",
                "data": {
                    "access": str(refresh.access_token),
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "display_name": user.display_name,
                        "role": membership.role if membership else "client",
                    },
                    "tenant": {
                        "slug": tenant.slug,
                        "name": tenant.name,
                        "logo_url": tenant.logo_url,
                        "accent_color": tenant.accent_color,
                        "tagline": tenant.tagline,
                    },
                },
            }
        )

        set_auth_cookies(response, refresh, cookie_name=f"client_refresh_{tenant.slug}")
        return response


class ClientLoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").lower().strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"success": False, "message": "Email and password are required."},
                status=400,
            )

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response(
                {"success": False, "message": "Invalid workspace."}, status=400
            )

        user = UserRepository.get_by_email(email)
        if user is None or not user.check_password(password):
            return Response(
                {"success": False, "message": "Invalid email or password."}, status=400
            )

        if not user.is_active:
            return Response(
                {"success": False, "message": "Your account is not active."},
                status=400,
            )

        membership = TenantMembership.objects.filter(
            user=user,
            tenant=tenant,
            role=TenantMembership.Role.CLIENT,
            is_active=True,
        ).first()

        if membership is None:
            return Response(
                {
                    "success": False,
                    "message": "You no longer have access to this workspace.",
                },
                status=400,
            )

        try:
            client_profile = Client.objects.get(
                user=user, tenant=tenant, is_deleted=False
            )
        except Client.DoesNotExist:
            return Response(
                {"success": False, "message": "Invalid email or password."}, status=400
            )

        if client_profile.is_deactivated:
            return Response(
                {
                    "success": False,
                    "message": "Your access has been deactivated. Contact your provider.",
                },
                status=400,
            )

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "display_name": user.display_name,
                    "role": membership.role,
                },
                "tenant": {
                    "slug": tenant.slug,
                    "name": tenant.name,
                    "logo_url": tenant.logo_url,
                    "accent_color": tenant.accent_color,
                    "tagline": tenant.tagline,
                },
            }
        )

        set_auth_cookies(response, refresh, cookie_name=f"client_refresh_{tenant.slug}")
        return response


class ClientForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response(
                {"success": False, "message": "Invalid workspace."}, status=400
            )

        serializer = ClientForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = PasswordResetService.request_reset(
            email=serializer.validated_data["email"]
        )

        if result:
            send_password_reset_email.delay(
                user_email=result["user"].email,
                display_name=result["user"].display_name,
                token=str(result["reset_token"].token),
                tenant_slug=tenant.slug,
            )

        return Response(
            {
                "success": True,
                "message": "If this email is registered, a reset link has been sent.",
            }
        )


class ClientResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClientResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            PasswordResetService.confirm_reset(
                token_value=serializer.validated_data["token"],
                new_password=serializer.validated_data["password"],
            )
        except InvalidOrExpiredToken as e:
            return Response({"success": False, "message": str(e)}, status=400)

        return Response({"success": True, "message": "Password reset successfully."})
