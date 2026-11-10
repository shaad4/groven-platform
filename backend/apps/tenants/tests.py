import pytest
from rest_framework import status
from django.test import RequestFactory
from django.http import JsonResponse
from apps.tenants.models import Tenant, TenantUsage
from apps.tenants.middleware import TenantMiddleware

@pytest.mark.django_db
class TestTenantModels:
    def test_tenant_limits_and_pro_property(self, tenant, free_plan, pro_tenant, pro_plan):
        assert tenant.effective_client_limit == free_plan.client_limit
        assert tenant.effective_request_limit == free_plan.request_limit
        assert tenant.is_pro is False

        assert pro_tenant.effective_client_limit == pro_plan.client_limit
        assert pro_tenant.effective_request_limit == pro_plan.request_limit
        assert pro_tenant.is_pro is True

    def test_client_limit_override(self, tenant):
        tenant.client_limit_override = 25
        tenant.save()
        assert tenant.effective_client_limit == 25


@pytest.mark.django_db
class TestTenantMiddleware:
    def test_middleware_resolves_tenant_from_header(self, tenant):
        factory = RequestFactory()
        # Request with X-Tenant-Slug header
        request = factory.get("/api/auth/me/", HTTP_X_TENANT_SLUG=tenant.slug)
        
        middleware = TenantMiddleware(get_response=lambda req: JsonResponse({"success": True}))
        response = middleware(request)

        assert request.tenant == tenant
        assert response.status_code == 200

    def test_middleware_blocks_suspended_tenant(self, tenant):
        tenant.is_suspended = True
        tenant.save()

        factory = RequestFactory()
        request = factory.get("/api/some-endpoint/", HTTP_X_TENANT_SLUG=tenant.slug)

        middleware = TenantMiddleware(get_response=lambda req: JsonResponse({"success": True}))
        response = middleware(request)

        assert response.status_code == 403
        # Normally return error message of suspension
        import json
        data = json.loads(response.content.decode("utf-8"))
        assert data["error_type"] == "tenant_suspended"


@pytest.mark.django_db
class TestTenantViews:
    def test_validate_tenant_view(self, api_client, tenant):
        # Valid slug
        url = f"/api/tenants/validate/?slug={tenant.slug}"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is True

        # Invalid slug
        url = "/api/tenants/validate/?slug=does-not-exist"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is False

        # Missing slug
        url = "/api/tenants/validate/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_tenant_public_info_view(self, provider_client, tenant):
        # Using client with X-Tenant-Slug already set
        url = "/api/tenants/info/"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == tenant.slug
        assert response.data["name"] == tenant.name

    def test_pwa_manifest_view(self, provider_client, tenant):
        url = "/api/tenants/manifest.json"
        response = provider_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == tenant.name
