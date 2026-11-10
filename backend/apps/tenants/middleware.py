from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.tenants.models import Tenant, TenantMembership

EXCLUDED_SUBDOMAINS = {"api", "www", "admin"}

SKIP_MEMBERSHIP_CHECK_PATHS = {
    "/api/auth/token/refresh/",
    "/api/auth/logout/",
}

EXCLUDED_FROM_SUSPENSION_CHECK = {
    "/api/auth/memberships/",
    "/api/auth/me/",
}


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]
        parts = host.split(".")

        is_subdomain = (len(parts) == 3) or (
            len(parts) == 2 and parts[1] == "localhost"
        )

        request.tenant = None

        if is_subdomain and parts[0] not in EXCLUDED_SUBDOMAINS:
            slug = parts[0]
            try:
                request.tenant = Tenant.objects.get(slug=slug, is_active=True)
            except Tenant.DoesNotExist:
                pass

        if request.tenant is None:
            slug = request.headers.get("X-Tenant-Slug")
            if slug and slug not in EXCLUDED_SUBDOMAINS:
                try:
                    request.tenant = Tenant.objects.get(slug=slug, is_active=True)
                except Tenant.DoesNotExist:
                    pass

        if (
            request.tenant is not None
            and request.tenant.is_suspended
            and request.path not in EXCLUDED_FROM_SUSPENSION_CHECK
        ):
            return JsonResponse(
                {
                    "success": False,
                    "error_type": "tenant_suspended",
                    "message": "This workspace has been suspended.",
                },
                status=403,
            )

        request.tenant_membership = None
        auth_user = None

        if request.tenant is not None:
            try:
                jwt_auth = JWTAuthentication()
                result = jwt_auth.authenticate(request)
                if result is not None:
                    auth_user, _ = result
            except Exception:
                pass

        # Skip membership enforcement for token/auth endpoints
        if request.path in SKIP_MEMBERSHIP_CHECK_PATHS:
            return self.get_response(request)

        if auth_user is not None and not auth_user.is_superuser:
            membership = TenantMembership.objects.filter(
                user=auth_user,
                tenant=request.tenant,
                is_active=True,
            ).first()

            if membership is None:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "You do not have access to this workspace.",
                    },
                    status=403,
                )

            request.tenant_membership = membership

        return self.get_response(request)
