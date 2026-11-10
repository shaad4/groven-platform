from rest_framework.permissions import BasePermission


class IsGroveSuperuser(BasePermission):
    """Groven Admin endpoints are restricted to the single provisioned superuser."""

    message = "Groven admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_superuser
        )
