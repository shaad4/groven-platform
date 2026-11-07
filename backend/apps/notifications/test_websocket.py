import pytest
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken
from apps.notifications.models import Notification
from apps.notifications.utils import create_notification
from apps.tenants.models import TenantMembership
from config.asgi import application


@pytest.mark.django_db(transaction=True)
def test_feed_delivery_is_workspace_scoped(tenant, pro_tenant, provider_user, provider_membership):
    TenantMembership.objects.create(tenant=pro_tenant, user=provider_user, role="provider")
    token = RefreshToken.for_user(provider_user).access_token

    async def check():
        first = WebsocketCommunicator(application, f"/ws/feed/?tenant={tenant.slug}", subprotocols=["groven.v1", f"groven.auth.{token}"])
        second = WebsocketCommunicator(application, f"/ws/feed/?tenant={pro_tenant.slug}", subprotocols=["groven.v1", f"groven.auth.{token}"])
        assert (await first.connect())[0]
        assert (await second.connect())[0]
        try:
            for workspace, recipient, other in [(tenant, first, second), (pro_tenant, second, first)]:
                await database_sync_to_async(create_notification)(
                    tenant=workspace, recipient=provider_user,
                    event_type=Notification.EventType.NEW_MESSAGE,
                    title=workspace.slug, body="Workspace-only message")
                assert (await recipient.receive_json_from(timeout=3))["title"] == workspace.slug
                assert await other.receive_nothing(timeout=0.1)
        finally:
            await first.disconnect()
            await second.disconnect()
    async_to_sync(check)()


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("direction", ["incoming", "outgoing"])
def test_revoked_feed_cannot_receive_events(tenant, provider_user, provider_membership, direction):
    token = RefreshToken.for_user(provider_user).access_token

    async def check():
        socket = WebsocketCommunicator(application, f"/ws/feed/?tenant={tenant.slug}", subprotocols=["groven.v1", f"groven.auth.{token}"])
        assert (await socket.connect())[0]
        await database_sync_to_async(TenantMembership.objects.filter(pk=provider_membership.pk).update)(is_active=False)
        if direction == "incoming":
            await socket.send_json_to({"type": "ping"})
        else:
            await database_sync_to_async(create_notification)(
                tenant=tenant, recipient=provider_user,
                event_type=Notification.EventType.NEW_MESSAGE,
                title="Not visible", body="Revoked")
        assert await socket.receive_output(timeout=3) == {"type": "websocket.close", "code": 4003}
        await socket.disconnect()
    async_to_sync(check)()

@pytest.mark.django_db(transaction=True)
def test_idle_feed_closes_when_access_token_expires(tenant, provider_user, provider_membership):
    from datetime import timedelta
    token = RefreshToken.for_user(provider_user).access_token
    token.set_exp(lifetime=timedelta(seconds=2))

    async def check():
        socket = WebsocketCommunicator(application, f"/ws/feed/?tenant={tenant.slug}", subprotocols=["groven.v1", f"groven.auth.{token}"])
        assert (await socket.connect())[0]
        # No client or group traffic: the expiry timer itself must close it.
        assert await socket.receive_output(timeout=3) == {"type": "websocket.close", "code": 4008}
        await socket.disconnect()
    async_to_sync(check)()
