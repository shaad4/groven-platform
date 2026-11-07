import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken
from config.asgi import application


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize('variant', ['valid', 'query', 'ambiguous', 'missing_protocol', 'invalid', 'both'])
def test_websocket_auth_transport(tenant, provider_user, provider_membership, variant):
    token = str(RefreshToken.for_user(provider_user).access_token)
    query = f'tenant={tenant.slug}'
    protocols = ['groven.v1', f'groven.auth.{token}']
    if variant == 'query':
        query += f'&token={token}'
        protocols = []
    elif variant == 'ambiguous':
        protocols += ['groven.auth.another']
    elif variant == 'missing_protocol':
        protocols = [f'groven.auth.{token}']
    elif variant == 'invalid':
        protocols = ['groven.v1', 'groven.auth.invalid']
    elif variant == 'both':
        query += f'&token={token}'

    async def check():
        socket = WebsocketCommunicator(application, f'/ws/feed/?{query}', subprotocols=protocols)
        connected, selected = await socket.connect()
        if variant == 'valid':
            assert connected and selected == 'groven.v1'
            await socket.send_json_to({'type': 'ping'})
            assert await socket.receive_json_from() == {'type': 'pong'}
        else:
            assert not connected and selected == 4001
        await socket.disconnect()
    async_to_sync(check)()
