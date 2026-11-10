import pytest
from rest_framework import status

@pytest.mark.django_db
class TestSettingsViews:
    def test_profile_settings_view(self, provider_client, provider_user):
        # GET profile
        response = provider_client.get("/api/settings/profile/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["email"] == provider_user.email

        # PATCH profile
        data = {"display_name": "New Display Name"}
        response = provider_client.patch("/api/settings/profile/", data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["display_name"] == "New Display Name"

    def test_workspace_settings_view(self, provider_client, tenant):
        # GET workspace settings
        response = provider_client.get("/api/settings/workspace/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["name"] == tenant.name

        # PATCH workspace settings
        data = {
            "name": "Updated Tenant Name",
            "tagline": "A new tagline",
            "accent_color": "#ff0000"
        }
        response = provider_client.patch("/api/settings/workspace/", data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["name"] == "Updated Tenant Name"

    def test_notification_settings_view(self, provider_client):
        # GET notification settings
        response = provider_client.get("/api/settings/notifications/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "email" in response.data["data"]

        # PATCH notification settings
        data = {
            "email": {
                "new_request": False,
                "client_reply": True
            }
        }
        response = provider_client.patch("/api/settings/notifications/", data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["email"]["new_request"] is False
