import pytest
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantMembership, Plan, TenantUsage
from apps.clients.models import Client
from rest_framework.test import APIClient
from unittest.mock import MagicMock

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def free_plan(db):
    plan, _ = Plan.objects.get_or_create(
        name="free",
        defaults={
            "client_limit": 3,
            "request_limit": 10,
            "price_monthly": 0.00,
        }
    )
    return plan

@pytest.fixture
def pro_plan(db):
    plan, _ = Plan.objects.get_or_create(
        name="pro",
        defaults={
            "client_limit": 100,
            "request_limit": 1000,
            "price_monthly": 49.00,
        }
    )
    return plan

@pytest.fixture
def tenant(db, free_plan):
    t, _ = Tenant.objects.get_or_create(
        slug="test-tenant",
        defaults={
            "name": "Test Tenant",
            "plan": free_plan,
            "is_active": True,
        }
    )
    # Ensure TenantUsage is present
    TenantUsage.objects.get_or_create(tenant=t)
    return t

@pytest.fixture
def pro_tenant(db, pro_plan):
    t, _ = Tenant.objects.get_or_create(
        slug="pro-tenant",
        defaults={
            "name": "Pro Tenant",
            "plan": pro_plan,
            "is_active": True,
        }
    )
    # Ensure TenantUsage is present
    TenantUsage.objects.get_or_create(tenant=t)
    return t

@pytest.fixture
def provider_user(db):
    return User.objects.create_user(
        email="provider@example.com",
        password="password123",
        display_name="Test Provider",
        is_active=True,
        is_email_verified=True
    )

@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@example.com",
        password="password123",
        display_name="Test Client",
        is_active=True,
        is_email_verified=True
    )

@pytest.fixture
def provider_membership(db, tenant, provider_user):
    return TenantMembership.objects.create(
        user=provider_user,
        tenant=tenant,
        role=TenantMembership.Role.PROVIDER,
        is_active=True
    )

@pytest.fixture
def client_membership(db, tenant, client_user):
    return TenantMembership.objects.create(
        user=client_user,
        tenant=tenant,
        role=TenantMembership.Role.CLIENT,
        is_active=True
    )

from rest_framework_simplejwt.tokens import RefreshToken

@pytest.fixture
def provider_client(api_client, provider_user, provider_membership, tenant):
    refresh = RefreshToken.for_user(provider_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    api_client.defaults["HTTP_X_TENANT_SLUG"] = tenant.slug
    return api_client


@pytest.fixture
def client_profile(db, tenant, client_user, client_membership, provider_user):
    return Client.objects.create(
        tenant=tenant,
        user=client_user,
        membership=client_membership,
        provider=provider_user,
        client_name=client_user.display_name,
        client_email=client_user.email,
        status=Client.Status.ACTIVE
    )

@pytest.fixture
def client_client(api_client, client_user, client_membership, client_profile, tenant):
    refresh = RefreshToken.for_user(client_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    api_client.defaults["HTTP_X_TENANT_SLUG"] = tenant.slug
    return api_client



# standard mock for stripe
@pytest.fixture(autouse=True)
def mock_stripe(monkeypatch):
    stripe_mock = MagicMock()
    monkeypatch.setattr("stripe.Price.retrieve", stripe_mock)
    monkeypatch.setattr("stripe.Customer.create", stripe_mock)
    monkeypatch.setattr("stripe.Subscription.create", stripe_mock)
    monkeypatch.setattr("stripe.Webhook.construct_event", stripe_mock)
    return stripe_mock

# standard mock for external AI clients
@pytest.fixture(autouse=True)
def mock_ai_service(monkeypatch):
    complete_mock = MagicMock(return_value="Mocked AI Response")
    monkeypatch.setattr("apps.common.ai.client.AIService.complete", complete_mock)
    return complete_mock

