from celery import shared_task
from django.core.cache import cache

from apps.common.logger import logger
from apps.tenants.models import TenantUsage


@shared_task
def cache_tenant_usage_stats():
    """
    Every 30 min — read tenant_usage counts from DB and write to Redis.
    Keeps plan-limit checks off Postgres on every request.
    """

    usages = TenantUsage.objects.select_related("tenant").all()

    cached = 0
    for usage in usages:
        key = f"tenant_usage:{usage.tenant_id}"
        cache.set(
            key,
            {
                "client_count": usage.client_count,
                "active_request_count": usage.active_request_count,
            },
            timeout=3600,
        )
        cached += 1

    logger.info(f"[cache_tenant_usage_stats] Cached stats for {cached} tenant(s).")
    return cached
