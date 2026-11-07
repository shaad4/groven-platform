"""Opt-in local benchmark: GROVEN_BENCHMARK=1 pytest benchmarks -s ..."""
import json
import os
from statistics import median
from time import perf_counter

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from apps.request_management.models import File, Request
from apps.request_management.repositories import RequestRepository
from apps.request_management.serializers import RequestListSerializer

pytestmark = [pytest.mark.django_db, pytest.mark.skipif(
    os.getenv("GROVEN_BENCHMARK") != "1", reason="Opt-in synthetic benchmark")]


def test_request_list_latency(tenant, client_profile, provider_user):
    requests = Request.objects.bulk_create([
        Request(tenant=tenant, client=client_profile, provider=provider_user,
                title=f"Benchmark request {i}") for i in range(500)
    ])
    File.objects.bulk_create([
        File(tenant=tenant, request=request, uploaded_by=provider_user,
             file_name="sample.txt", file_size_bytes=100) for request in requests
    ])
    results = []
    for size in (50, 500):
        timings = {"before": [], "after": []}
        query_counts = {}
        for iteration in range(7):
            for variant in ("before", "after"):
                if variant == "before":
                    query = Request.objects.filter(tenant=tenant, is_deleted=False).select_related("client__user", "provider").order_by("-created_at")
                else:
                    query = RequestRepository.get_all_for_provider(tenant.id)
                start = perf_counter()
                with CaptureQueriesContext(connection) as captured:
                    data = RequestListSerializer(query[:size], many=True).data
                elapsed = (perf_counter() - start) * 1000
                assert len(data) == size and all(row["file_count"] == 1 for row in data)
                if iteration:  # discard one warmup per variant
                    timings[variant].append(elapsed)
                query_counts[variant] = len(captured)
        results.append({"rows": size, "queries": query_counts,
                        "median_ms": {name: round(median(values), 2) for name, values in timings.items()},
                        "samples_ms": timings})
    print("BENCHMARK=" + json.dumps(results))
