import pytest
import uuid
from django.utils import timezone
from rest_framework import status
from unittest.mock import patch

from apps.clients.models import Client, Tag, ClientTagMap, Invite
from apps.clients.tasks import expire_old_invites, mark_inactive_clients
from apps.users.models import User

@pytest.mark.django_db
class TestClientModels:
    def test_create_client_and_tag(self, tenant, provider_user):
        # Create client profile
        client = Client.objects.create(
            tenant=tenant,
            provider=provider_user,
            client_name="Test Client Name",
            client_email="clienttest@example.com"
        )
        assert client.status == Client.Status.PENDING
        assert client.is_deactivated is False

        # Create tag
        tag = Tag.objects.create(tenant=tenant, name="High Priority", color="#FF0000")
        assert tag.name == "High Priority"

        # Map client and tag
        mapping = ClientTagMap.objects.create(client=client, tag=tag)
        assert mapping.client == client
        assert mapping.tag == tag

    def test_create_invite(self, tenant, provider_user):
        invite = Invite.objects.create(
            tenant=tenant,
            provider=provider_user,
            client_email="invited@example.com",
            client_name="Invited User",
            expires_at=timezone.now() + timezone.timedelta(days=7)
        )
        assert invite.status == Invite.Status.PENDING
        assert invite.token is not None


@pytest.mark.django_db
class TestClientTasks:
    def test_expire_old_invites(self, tenant, provider_user):
        # Create an expired invite
        expired_invite = Invite.objects.create(
            tenant=tenant,
            provider=provider_user,
            client_email="expired_invite@example.com",
            client_name="Expired Invite User",
            expires_at=timezone.now() - timezone.timedelta(hours=1),
            status=Invite.Status.PENDING
        )
        
        # Create a non-expired invite
        active_invite = Invite.objects.create(
            tenant=tenant,
            provider=provider_user,
            client_email="active_invite@example.com",
            client_name="Active Invite User",
            expires_at=timezone.now() + timezone.timedelta(days=1),
            status=Invite.Status.PENDING
        )

        expire_old_invites()

        expired_invite.refresh_from_db()
        active_invite.refresh_from_db()

        assert expired_invite.status == Invite.Status.EXPIRED
        assert active_invite.status == Invite.Status.PENDING


@pytest.mark.django_db
class TestClientViews:
    @patch("apps.clients.views.send_client_invite_email.delay")
    @patch("apps.clients.services.logger")
    def test_client_list_create_view(self, mock_logger, mock_send_email, provider_client, tenant, provider_user):
        url = "/api/clients/"
        
        # Create client (invitation)
        data = {
            "client_name": "New Client To Invite",
            "client_email": "newinvite@example.com"
        }
        response = provider_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["data"]["email"] == "newinvite@example.com"
        
        # List clients
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) >= 1

    def test_client_deactivate_reactivate_view(self, provider_client, tenant, provider_user):
        client = Client.objects.create(
            tenant=tenant,
            provider=provider_user,
            client_name="Deactivate Target",
            client_email="deactivatetarget@example.com",
            status=Client.Status.ACTIVE
        )

        # Deactivate
        url = f"/api/clients/{client.id}/deactivate/"
        response = provider_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        client.refresh_from_db()
        assert client.is_deactivated is True

        # Reactivate
        url = f"/api/clients/{client.id}/reactivate/"
        response = provider_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        client.refresh_from_db()
        assert client.is_deactivated is False
