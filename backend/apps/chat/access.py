from apps.request_management.models import Request
from apps.tenants.models import TenantMembership


def get_chat_request(request_id, tenant, user):
    """Apply the same request visibility policy to HTTP and WebSocket chat."""
    if tenant is None or not user or not user.is_authenticated or not user.is_active:
        return None
    membership = TenantMembership.objects.filter(
        tenant=tenant, user=user, is_active=True, user__is_active=True,
        tenant__is_active=True, tenant__is_suspended=False
    ).first()
    if membership is None:
        return None
    requests = Request.objects.filter(
        id=request_id, tenant=tenant, is_deleted=False, client__is_deleted=False
    ).select_related("client__user", "provider", "tenant")
    if membership.role == TenantMembership.Role.CLIENT:
        requests = requests.filter(client__user=user)
    elif membership.role != TenantMembership.Role.PROVIDER:
        return None
    return requests.first()
