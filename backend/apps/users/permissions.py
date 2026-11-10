from rest_framework.permissions import BasePermission


class IsTenantMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.tenant is None:
            return True  # main domain routes, no tenant scoping needed
        return request.user.tenant_id == request.tenant.id
