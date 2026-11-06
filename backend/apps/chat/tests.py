import pytest
from rest_framework import status
from apps.chat.models import Message
from apps.request_management.models import Request

@pytest.mark.django_db
class TestChatViews:
    def test_message_list_create_view(self, provider_client, tenant, client_profile, provider_user):
        req = Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Chat Request",
            description="Testing chat views"
        )

        url = f"/api/requests/{req.id}/messages/"
        # Create message
        data = {
            "content": "Hello client!"
        }
        response = provider_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["message"]["content"] == "Hello client!"

        # List messages
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["results"]) == 1

    def test_mark_messages_read_view(self, client_client, tenant, client_profile, provider_user):
        req = Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Chat Request",
            description="Testing chat views"
        )
        # Create an unread message from provider
        Message.objects.create(
            request=req,
            tenant=tenant,
            sender=provider_user,
            content="Message from provider",
            is_read=False
        )

        url = f"/api/requests/{req.id}/messages/mark-read/"
        response = client_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

        unread_count = Message.objects.filter(request=req, is_read=False).count()
        assert unread_count == 0

@pytest.mark.django_db
@pytest.mark.parametrize("action", ["list", "send", "read"])
def test_other_clients_cannot_access_chat(client_client, tenant, provider_user, action):
    from apps.clients.models import Client
    other = Client.objects.create(tenant=tenant, provider=provider_user,
                                  client_name="Other", client_email="other@example.com")
    req = Request.objects.create(tenant=tenant, client=other, provider=provider_user,
                                 title="Private", description="Private")
    url = f"/api/requests/{req.id}/messages/"
    if action == "list":
        response = client_client.get(url)
    elif action == "send":
        response = client_client.post(url, {"content": "Intrusion"}, format="json")
    else:
        response = client_client.post(url + "mark-read/")
    assert response.status_code == 404
    assert not Message.objects.filter(request=req).exists()


@pytest.mark.django_db(transaction=True)
def test_websocket_rejects_other_client(tenant, client_user, client_profile, provider_user):
    from asgiref.sync import async_to_sync
    from channels.testing import WebsocketCommunicator
    from apps.chat.consumers import RequestChatConsumer
    from apps.clients.models import Client
    other = Client.objects.create(tenant=tenant, provider=provider_user,
                                  client_name="Other", client_email="other@example.com")
    req = Request.objects.create(tenant=tenant, client=other, provider=provider_user,
                                 title="Private", description="Private")

    async def check():
        socket = WebsocketCommunicator(RequestChatConsumer.as_asgi(), "/")
        socket.scope.update(user=client_user, tenant=tenant,
                            url_route={"kwargs": {"request_id": str(req.id)}})
        connected, code = await socket.connect()
        assert not connected
        assert code == 4004
        await socket.disconnect()
    async_to_sync(check)()
