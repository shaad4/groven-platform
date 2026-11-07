import asyncio
import time
from contextlib import suppress

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.common.logger import logger
from apps.tenants.models import TenantMembership


class RevocableTenantConsumer(AsyncJsonWebsocketConsumer):
    """Check live access before processing inbound or delivering outbound events.

    An idle connection closes on its next event; no revocation polling or cached
    membership is used. Disconnect must always run to release group membership.
    """

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            task = getattr(self, "expiry_task", None)
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task

    async def accept(self, subprotocol=None, headers=None):
        await super().accept(subprotocol=self.scope.get("websocket_protocol", subprotocol), headers=headers)
        expires = self.scope.get("token_expires_at")
        if expires is not None:
            async def expire():
                await asyncio.sleep(max(0, expires - time.time()))
                await self.channel_layer.send(self.channel_name, {"type": "auth.expired"})
            self.expiry_task = asyncio.create_task(expire())

    async def deny_access(self, code):
        self.access_revoked = True
        task = getattr(self, "expiry_task", None)
        if task:
            task.cancel()
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
        finally:
            await self.close(code=code)

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
            expires = self.scope.get("token_expires_at")
            if message["type"] == "auth.expired" or (expires is not None and time.time() >= expires):
                await self.deny_access(4008)
                return
            try:
                allowed = await database_sync_to_async(self.has_current_access)()
            except Exception:
                logger.exception("WebSocket access revalidation failed")
                allowed = False  # fail closed on unavailable authorization data
            if not allowed:
                await self.deny_access(4003)
                return
        await super().dispatch(message)
