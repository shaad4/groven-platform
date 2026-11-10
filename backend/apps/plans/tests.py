import pytest
from rest_framework import status
from apps.tenants.models import Plan, BillingHistory
from django.utils import timezone

@pytest.mark.django_db
class TestPlansViews:
    def test_public_plan_pricing_view(self, api_client, free_plan, pro_plan):
        url = "/api/billing/pricing/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["data"]) >= 2

    def test_billing_history_view(self, provider_client, tenant, free_plan):
        # Create billing history record
        BillingHistory.objects.create(
            tenant=tenant,
            plan=free_plan,
            amount=0.00,
            currency="USD",
            stripe_invoice_id="in_mock123",
            status=BillingHistory.Status.PAID,
            period_start=timezone.now().date(),
            period_end=timezone.now().date()
        )

        url = "/api/billing/history/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["status"] == BillingHistory.Status.PAID
