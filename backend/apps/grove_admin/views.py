from django.conf import settings
from django.core.paginator import Paginator
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.logger import logger
from apps.users.models import User
from apps.users.utils import set_auth_cookies

from .permissions import IsGroveSuperuser
from .serializers import (AdminPlanOverviewSerializer, AdminStatsSerializer,
                          AdminTenantDetailSerializer,
                          AdminTenantListSerializer, AdminUserListSerializer,
                          GroveAdminLoginSerializer, OverrideLimitSerializer,
                          PlanConfigSerializer, PlanUpdateSerializer)
from .services import (AccountLocked, GroveAdminAuthService,
                       InvalidAdminCredentials, InvalidLimitValue,
                       InvalidPlanValue, PlanAdminService, PlanNotFound,
                       StatsService, StripePriceSyncError, TenantAdminService,
                       TenantNotFound, UserAdminService, UserNotFound)

# Create your views here.


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class GroveAdminTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_token = request.COOKIES.get("grove_admin_refresh")
        if not raw_token:
            return Response(
                {"success": False, "message": "No refresh token found."}, status=401
            )

        try:
            refresh = RefreshToken(raw_token)
        except TokenError:
            return Response(
                {
                    "success": False,
                    "message": "Invalid or expired session. Please log in again.",
                },
                status=401,
            )

        user_id = refresh.payload.get("user_id")
        admin_user = User.objects.filter(id=user_id, is_superuser=True).first()
        if not admin_user:
            logger.warning(
                f"[grove_admin_auth] Refresh attempted with a non-superuser token (user_id={user_id})."
            )
            return Response(
                {"success": False, "message": "Invalid session."}, status=401
            )

        return Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "admin": {"email": admin_user.email},
            }
        )


class GroveAdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GroveAdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip_address = _client_ip(request)

        try:
            admin_user = GroveAdminAuthService.authenticate(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
                ip_address=ip_address,
            )
        except AccountLocked as e:
            return Response(
                {"success": False, "error_type": "locked", "message": str(e)},
                status=429,
            )
        except InvalidAdminCredentials as e:
            return Response(
                {
                    "success": False,
                    "error_type": "invalid_credentials",
                    "message": str(e),
                },
                status=400,
            )

        refresh = RefreshToken.for_user(admin_user)

        response = Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "admin": {"email": admin_user.email},
            }
        )
        set_auth_cookies(response, refresh, cookie_name="grove_admin_refresh")
        return response


class AdminStatsView(APIView):
    permission_classes = [IsGroveSuperuser]

    def get(self, request):
        try:
            data = StatsService.get_dashboard_stats()
        except Exception as e:
            logger.error(f"[grove_admin] Failed to load stats: {e}")
            return Response(
                {"success": False, "message": "Could not load dashboard stats."},
                status=500,
            )
        return Response({"success": True, "data": AdminStatsSerializer(data).data})


class AdminTenantListView(APIView):
    permission_classes = [IsGroveSuperuser]

    def get(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        try:
            rows = TenantAdminService.list_tenants(
                search=request.query_params.get("search"),
                plan_name=request.query_params.get("plan"),
                status=request.query_params.get("status"),
            )
        except Exception as e:
            logger.error(f"[grove_admin] Failed to load tenants: {e}")
            return Response(
                {"success": False, "message": "Could not load tenants."}, status=500
            )

        paginator = Paginator(rows, page_size)
        page_obj = paginator.get_page(page)

        serializer = AdminTenantListSerializer(page_obj.object_list, many=True)
        return Response(
            {
                "success": True,
                "data": {
                    "results": serializer.data,
                    "total": paginator.count,
                    "page": page,
                    "page_size": page_size,
                    "num_pages": paginator.num_pages,
                },
            }
        )


class AdminTenantDetailView(APIView):
    permission_classes = [IsGroveSuperuser]

    def get(self, request, tenant_id):
        try:
            data = TenantAdminService.get_tenant_detail(tenant_id)
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response(
            {"success": True, "data": AdminTenantDetailSerializer(data).data}
        )


class AdminTenantUpgradeView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, tenant_id):
        try:
            tenant = TenantAdminService.upgrade_to_pro(request.user, tenant_id)
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except PlanNotFound as e:
            logger.error(f"[grove_admin] {e}")
            return Response({"success": False, "message": str(e)}, status=500)
        return Response({"success": True, "message": f"{tenant.name} upgraded to Pro."})


class AdminTenantDowngradeView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, tenant_id):
        try:
            tenant = TenantAdminService.downgrade_to_free(request.user, tenant_id)
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except PlanNotFound as e:
            logger.error(f"[grove_admin] {e}")
            return Response({"success": False, "message": str(e)}, status=500)
        return Response(
            {"success": True, "message": f"{tenant.name} downgraded to Free."}
        )


class AdminTenantSuspendView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, tenant_id):
        try:
            tenant = TenantAdminService.suspend(request.user, tenant_id)
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response({"success": True, "message": f"{tenant.name} suspended."})


class AdminTenantUnsuspendView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, tenant_id):
        try:
            tenant = TenantAdminService.unsuspend(request.user, tenant_id)
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response({"success": True, "message": f"{tenant.name} unsuspended."})


class AdminTenantOverrideLimitView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, tenant_id):
        serializer = OverrideLimitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tenant = TenantAdminService.override_client_limit(
                request.user, tenant_id, serializer.validated_data.get("limit")
            )
        except TenantNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except InvalidLimitValue as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response(
            {
                "success": True,
                "message": f"Client limit override updated for {tenant.name}.",
                "data": {"client_limit_override": tenant.client_limit_override},
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsGroveSuperuser]

    def get(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))

        memberships = UserAdminService.list_users(
            search=request.query_params.get("search"),
            role=request.query_params.get("role"),
            status=request.query_params.get("status"),
        )

        paginator = Paginator(memberships, page_size)
        page_obj = paginator.get_page(page)

        serializer = AdminUserListSerializer(page_obj.object_list, many=True)
        return Response(
            {
                "success": True,
                "data": {
                    "users": serializer.data,
                    "total": paginator.count,
                    "page": page,
                    "page_size": page_size,
                    "num_pages": paginator.num_pages,
                },
            }
        )


class AdminUserSendPasswordResetView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, user_id):
        try:
            user = UserAdminService.send_password_reset(request.user, user_id)
        except UserNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        return Response(
            {"success": True, "message": f"Password reset email sent to {user.email}."}
        )


class AdminUserDeactivateView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, user_id):
        try:
            user = UserAdminService.toggle_deactivate(request.user, user_id)
        except UserNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        state = "deactivated" if not user.is_active else "reactivated"
        return Response(
            {
                "success": True,
                "message": f"{user.email} {state}.",
                "data": {"is_active": user.is_active},
            }
        )


class AdminPlanListView(APIView):
    permission_classes = [IsGroveSuperuser]

    def get(self, request):
        try:
            data = PlanAdminService.get_plan_overview()
        except Exception as e:
            logger.error(f"[grove_admin] Failed to load plan overview: {e}")
            return Response(
                {"success": False, "message": "Could not load plan data."}, status=500
            )
        return Response(
            {"success": True, "data": AdminPlanOverviewSerializer(data).data}
        )


class AdminPlanUpdateView(APIView):
    permission_classes = [IsGroveSuperuser]

    def post(self, request, plan_id):
        serializer = PlanUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            plan = PlanAdminService.update_plan(
                request.user,
                plan_id,
                price_monthly=serializer.validated_data.get("price_monthly"),
                client_limit=serializer.validated_data.get("client_limit"),
                request_limit=serializer.validated_data.get("request_limit"),
            )
        except PlanNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except InvalidPlanValue as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except StripePriceSyncError as e:
            logger.error(f"[grove_admin] {e}")
            return Response(
                {"success": False, "message": f"Stripe sync failed: {e}"}, status=502
            )

        return Response(
            {
                "success": True,
                "message": f"{plan.name.capitalize()} plan updated.",
                "data": PlanConfigSerializer(plan).data,
            }
        )


class GroveAdminLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"success": True})
        response.delete_cookie(
            "grove_admin_refresh",
            path="/",
            domain=settings.COOKIE_DOMAIN,
            samesite="None",
        )
        return response
