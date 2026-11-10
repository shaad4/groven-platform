import pytest
from rest_framework import status
from apps.request_management.models import Request

@pytest.mark.django_db
class TestDashboardViews:
    def test_dashboard_stats_view(self, provider_client, tenant, client_profile, provider_user):
        # Create a request to populate some stats
        Request.objects.create(
            tenant=tenant,
            client=client_profile,
            provider=provider_user,
            title="Dashboard test request",
            description="Testing dashboard statistics"
        )

        url = "/api/dashboard/stats/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "stats" in response.data["data"]

    def test_sidebar_badges_view(self, provider_client):
        url = "/api/dashboard/badges/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "clients" in response.data["data"]

    def test_activity_feed_view(self, provider_client):
        url = "/api/dashboard/activity/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "results" in response.data["data"]
