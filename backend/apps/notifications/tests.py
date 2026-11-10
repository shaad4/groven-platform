import pytest
from rest_framework import status
from apps.notifications.models import Notification

@pytest.mark.django_db
class TestNotificationModels:
    def test_create_notification(self, tenant, provider_user):
        notif = Notification.objects.create(
            tenant=tenant,
            recipient=provider_user,
            event_type=Notification.EventType.NEW_REQUEST,
            title="New Request Submitted",
            body="A client has submitted a new request."
        )
        assert notif.is_read is False
        assert notif.emailed_at is None
        assert str(notif).startswith("[new_request]")


@pytest.mark.django_db
class TestNotificationViews:
    def test_notification_list_view(self, provider_client, tenant, provider_user):
        # Create notification
        Notification.objects.create(
            tenant=tenant,
            recipient=provider_user,
            event_type=Notification.EventType.NEW_REQUEST,
            title="New Request",
            body="Someone created a request."
        )

        url = "/api/notifications/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["title"] == "New Request"

    def test_mark_notification_read(self, provider_client, tenant, provider_user):
        notif = Notification.objects.create(
            tenant=tenant,
            recipient=provider_user,
            event_type=Notification.EventType.NEW_REQUEST,
            title="New Request",
            body="Someone created a request."
        )

        url = f"/api/notifications/{notif.id}/read/"
        response = provider_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Marked as read."

        notif.refresh_from_db()
        assert notif.is_read is True
        assert notif.read_at is not None

    def test_mark_all_read(self, provider_client, tenant, provider_user):
        Notification.objects.create(
            tenant=tenant,
            recipient=provider_user,
            event_type=Notification.EventType.NEW_REQUEST,
            title="Notif 1",
            body="Someone created a request."
        )
        Notification.objects.create(
            tenant=tenant,
            recipient=provider_user,
            event_type=Notification.EventType.NEW_MESSAGE,
            title="Notif 2",
            body="Someone sent a message."
        )

        url = "/api/notifications/read-all/"
        response = provider_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "All notifications marked as read."

        unread_count = Notification.objects.filter(recipient=provider_user, is_read=False).count()
        assert unread_count == 0
