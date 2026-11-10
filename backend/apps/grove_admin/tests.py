import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

@pytest.fixture(autouse=True)
def override_admin_settings(settings):
    settings.GROVE_ADMIN_EMAIL = "admin@grove.co"
    settings.GROVE_ADMIN_PASSWORD = "adminpassword"

@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        email="admin@grove.co",
        password="adminpassword",
        display_name="Grove Admin",
        is_active=True,
        is_email_verified=True
    )

@pytest.fixture
def admin_client(api_client, superuser):
    refresh = RefreshToken.for_user(superuser)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client

@pytest.mark.django_db
class TestGroveAdminViews:
    def test_admin_login(self, api_client, superuser):
        url = "/api/grove-admin/login/"
        data = {
            "email": "admin@grove.co",
            "password": "adminpassword"
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["admin"]["email"] == "admin@grove.co"

    def test_admin_stats(self, admin_client):
        url = "/api/grove-admin/stats/"
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "total_tenants" in response.data["data"]

    def test_admin_tenant_list(self, admin_client, tenant):
        url = "/api/grove-admin/tenants/"
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["data"]["results"]) >= 1

    def test_admin_tenant_suspend_unsuspend(self, admin_client, tenant):
        # Suspend tenant
        suspend_url = f"/api/grove-admin/tenants/{tenant.id}/suspend/"
        response = admin_client.post(suspend_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

        tenant.refresh_from_db()
        assert tenant.is_suspended is True

        # Unsuspend tenant
        unsuspend_url = f"/api/grove-admin/tenants/{tenant.id}/unsuspend/"
        response = admin_client.post(unsuspend_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

        tenant.refresh_from_db()
        assert tenant.is_suspended is False
