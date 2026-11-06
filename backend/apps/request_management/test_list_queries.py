import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from apps.request_management.models import Request, File
from apps.request_management.repositories import RequestRepository
from apps.request_management.serializers import RequestListSerializer


@pytest.mark.django_db
@pytest.mark.parametrize("count", [1, 20])
def test_request_list_has_constant_query_count(tenant, client_profile, provider_user, count):
    for number in range(count):
        req = Request.objects.create(tenant=tenant, client=client_profile,
                                     provider=provider_user, title=str(number))
        File.objects.create(tenant=tenant, request=req, uploaded_by=provider_user,
                            file_name="visible.txt", file_size_bytes=10)
        File.objects.create(tenant=tenant, request=req, uploaded_by=provider_user,
                            file_name="deleted.txt", file_size_bytes=10, is_deleted=True)
    # Retain the pre-optimization query shape as a measurable baseline.
    baseline = Request.objects.filter(tenant=tenant, is_deleted=False).select_related("client__user", "provider")
    with CaptureQueriesContext(connection) as before:
        RequestListSerializer(baseline, many=True).data
    assert len(before) == count + 1
    with CaptureQueriesContext(connection) as queries:
        result = RequestListSerializer(RequestRepository.get_all_for_provider(tenant.id), many=True).data
    assert len(queries) == 1
    assert len(result) == count
    assert all(item["file_count"] == 1 for item in result)
