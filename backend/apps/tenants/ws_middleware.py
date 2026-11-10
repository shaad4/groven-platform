from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.tenants.models import Tenant, TenantMembership
from apps.users.models import User


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser()


@database_sync_to_async
def get_tenant(slug):
    try:
        return Tenant.objects.get(slug=slug, is_active=True)
    except Tenant.DoesNotExist:
        return None


@database_sync_to_async
def get_membership(user, tenant):
    try:
        return TenantMembership.objects.select_related("user", "tenant").get(
            user=user,
            tenant=tenant,
            is_active=True,
        )
    except TenantMembership.DoesNotExist:
        return None


class JWTTenantAuthMiddleware(BaseMiddleware):
    """
    WebSocket middleware that:
    1. Reads ?token=<access_token> from the WS URL query string
    2. Reads ?tenant=<slug> from the WS URL query string
    3. Validates the token via simplejwt
    4. Confirms the user has an active membership in that tenant
    5. Attaches scope["user"], scope["tenant"], scope["tenant_membership"]
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)

        token_list = params.get("token", [])
        slug_list = params.get("tenant", [])

        scope["user"] = AnonymousUser()
        scope["tenant"] = None
        scope["tenant_membership"] = None

        if not token_list or not slug_list:
            await self._close_unauthorized(send)
            return

        raw_token = token_list[0]
        slug = slug_list[0]

        # Validating JWT
        try:
            validated = AccessToken(raw_token)
            user_id = validated["user_id"]
        except (InvalidToken, TokenError, KeyError):
            await self._close_unauthorized(send)
            return

        # Resolve user
        user = await get_user(user_id)
        if isinstance(user, AnonymousUser):
            await self._close_unauthorized(send)
            return

        # Resolve tenant
        tenant = await get_tenant(slug)
        if tenant is None:
            await self._close_unauthorized(send)
            return

        # confirm membership
        membership = await get_membership(user, tenant)
        if membership is None:
            await self._close_unauthorized(send)
            return

        scope["user"] = user
        scope["tenant"] = tenant
        scope["tenant_membership"] = membership

        await super().__call__(scope, receive, send)

    async def _close_unauthorized(self, send):
        await send(
            {
                "type": "websocket.close",
                "code": 4001,
            }
        )
