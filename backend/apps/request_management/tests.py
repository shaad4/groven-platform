import pytest
from rest_framework import status
from unittest.mock import patch
from apps.request_management.models import Request, RequestActivity, InternalNote, Delivery, File

@pytest.mark.django_db
class TestRequestModels:
    def test_create_request_and_activity(self, tenant, client_profile, provider_user):
        req = Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Fix CSS styling issues",
            description="The alignment of header is off"
        )
        assert req.status == Request.Status.RECEIVED
        assert req.is_urgent is False
        assert req.is_deleted is False

        # Activity
        activity = RequestActivity.objects.create(
            request=req,
            tenant=tenant,
            actor=provider_user,
            actor_source=RequestActivity.ActorSource.USER,
            event_type=RequestActivity.EventType.REQUEST_CREATED,
            description="Request was created."
        )
        assert activity.request == req
        assert activity.event_type == RequestActivity.EventType.REQUEST_CREATED


@pytest.mark.django_db
class TestRequestViews:
    def test_client_create_request_view(self, client_client, tenant, client_profile, provider_user):
        url = "/api/requests/"
        data = {
            "title": "API Integration Problem",
            "description": "Getting 500 server error when calling webhook",
            "is_urgent": True
        }
        response = client_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["data"]["title"] == "API Integration Problem"
        assert response.data["data"]["is_urgent"] is False

        # List requests as client
        response = client_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["data"]["requests"]) >= 1

    def test_provider_change_status_view(self, provider_client, tenant, client_profile, provider_user):
        req = Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Design Dashboard Mockups",
            description="Need dashboard screen mockups"
        )

        url = f"/api/requests/{req.id}/status/"
        data = {
            "status": "in_review"
        }
        response = provider_client.patch(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        
        req.refresh_from_db()
        assert req.status == Request.Status.IN_REVIEW

    def test_internal_note_create_view(self, provider_client, tenant, client_profile, provider_user):
        req = Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Design Dashboard Mockups",
            description="Need dashboard screen mockups"
        )

        url = f"/api/requests/{req.id}/notes/"
        data = {
            "content": "This is a private note for staff."
        }
        response = provider_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["data"]["content"] == "This is a private note for staff."
