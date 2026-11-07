from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.common.logger import logger
from apps.tenants.models import TenantMembership


class RevocableTenantConsumer(AsyncJsonWebsocketConsumer):
    """Check live access before processing inbound or delivering outbound events.

    An idle connection closes on its next event; no revocation polling or cached
    membership is used. Disconnect must always run to release group membership.
    """

    def has_current_access(self):
        user = self.scope.get("user")
        tenant = self.scope.get("tenant")
        if not user or not tenant:
            return False
        return TenantMembership.objects.filter(
            user_id=user.pk, tenant_id=tenant.pk, is_active=True,
            user__is_active=True, tenant__is_active=True, tenant__is_suspended=False,
        ).exists()

    async def dispatch(self, message):
        if message["type"] not in ("websocket.connect", "websocket.disconnect"):
            if getattr(self, "access_revoked", False):
                return
            try:
                allowed = await database_sync_to_async(self.has_current_access)()
            except Exception:
                logger.exception("WebSocket access revalidation failed")
                allowed = False  # fail closed on unavailable authorization data
            if not allowed:
                self.access_revoked = True
                if hasattr(self, "group_name"):
                    await self.channel_layer.group_discard(self.group_name, self.channel_name)
                await self.close(code=4003)
                return
        await super().dispatch(message)
