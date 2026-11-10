import base64
import csv
from datetime import timedelta
from io import StringIO

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Q
from django.db.models.functions import ExtractHour, ExtractWeekDay, TruncDate
from django.http import StreamingHttpResponse
from django.shortcuts import render
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.request_management.models import Request, RequestActivity
from apps.tenants.models import TenantMembership

# Create your views here.


def _require_provider(request):
    m = getattr(request, "tenant_membership", None)
    return m is not None and m.role == TenantMembership.Role.PROVIDER


class DashboardStatsView(APIView):
    """
    GET /dashboard/stats/

    Single cached endpoint for the provider dashboard.
    Payload is cached in Redis per tenant (TTL 2 min).
    Cache is invalidated from RequestService / ClientService after mutations.
    """

    permission_classes = [IsAuthenticated]
    CACHE_TTL = settings.CACHE_TTL

    def get(self, request):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        tenant = request.tenant
        cache_key = f"dashboard_stats:{tenant.id}"

        cached = cache.get(cache_key)
        if cached:
            return Response({"success": True, "data": cached, "cached": True})

        data = self._build_stats(tenant)
        cache.set(cache_key, data, timeout=self.CACHE_TTL)
        return Response({"success": True, "data": data, "cached": False})

    def _build_stats(self, tenant):
        tid = tenant.id
        now = timezone.now()
        week_start = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        five_days_ago = now - timedelta(days=5)

        # counters
        total_clients = Client.objects.filter(
            tenant_id=tid,
            is_deleted=False,
            is_deactivated=False,
        ).count()

        active_requests = Request.objects.filter(
            tenant_id=tid,
            is_deleted=False,
            client__is_deleted=False,
            status__in=[
                Request.Status.RECEIVED,
                Request.Status.IN_REVIEW,
                Request.Status.IN_PROGRESS,
            ],
        ).count()

        # Deliverd this week counts

        delivered_this_week = Request.objects.filter(
            tenant_id=tid,
            status=Request.Status.DELIVERED,
            is_deleted=False,
            client__is_deleted=False,
            updated_at__gte=week_start,
        ).count()

        closed_this_week = RequestActivity.objects.filter(
            tenant_id=tid,
            event_type=RequestActivity.EventType.STATUS_CHANGE,
            metadata__to="closed",
            created_at__gte=week_start,
            request__client__is_deleted=False,
        ).count()

        # Inactive clients count

        active_client_ids = (
            Request.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                client__is_deleted=False,
                created_at__gte=five_days_ago,
            )
            .values_list("client_id", flat=True)
            .distinct()
        )

        inactive_clients = (
            Client.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                is_deactivated=False,
            )
            .exclude(id__in=active_client_ids)
            .count()
        )

        # Recent Requests - 5
        raw_recent = (
            Request.objects.filter(
                tenant_id=tid, is_deleted=False, client__is_deleted=False
            )
            .select_related("client__user")
            .order_by("-created_at")[:5]
            .values(
                "id",
                "title",
                "status",
                "is_urgent",
                "created_at",
                "updated_at",
                "client__user__display_name",
                "client__client_name",
            )
        )

        recent_requests = [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "status": r["status"],
                "is_urgent": r["is_urgent"],
                "created_at": r["created_at"].isoformat(),
                "updated_at": r["updated_at"].isoformat(),
                "client_name": r["client__user__display_name"]
                or r["client__client_name"]
                or "Unknown",
            }
            for r in raw_recent
        ]

        # Busiest Time Heatmap

        heatmap = list(
            Request.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                client__is_deleted=False,
                created_at__gte=thirty_days_ago,
            )
            .annotate(
                dow=ExtractWeekDay("created_at"),
                hour=ExtractHour("created_at"),
            )
            .values("dow", "hour")
            .annotate(count=Count("id"))
        )

        # Status Breakdown

        status_breakdown = list(
            Request.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                client__is_deleted=False,
                status__in=[
                    Request.Status.RECEIVED,
                    Request.Status.IN_REVIEW,
                    Request.Status.IN_PROGRESS,
                ],
            )
            .values("status")
            .annotate(count=Count("id"))
        )

        return {
            "stats": {
                "total_clients": total_clients,
                "open_requests": active_requests,
                "delivered_this_week": delivered_this_week + closed_this_week,
                "inactive_clients": inactive_clients,
            },
            "status_breakdown": status_breakdown,
            "recent_requests": recent_requests,
            "heatmap": heatmap,
        }


class SidebarBadgesView(APIView):
    permission_classes = [IsAuthenticated]

    CACHE_TTL = 120

    def get(self, request):
        if not _require_provider(request):
            return Response(
                {"success": False, "message": "Forbidden."},
                status=403,
            )

        tenant = request.tenant

        cache_key = f"sidebar_badges:{tenant.id}"

        cached = cache.get(cache_key)
        if cached:
            return Response(
                {
                    "success": True,
                    "data": cached,
                    "cached": True,
                }
            )

        tid = tenant.id

        data = {
            "clients": Client.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                is_deactivated=False,
            ).count(),
            "requests": Request.objects.filter(
                tenant_id=tid,
                is_deleted=False,
                client__is_deleted=False,
                status__in=[
                    Request.Status.RECEIVED,
                    Request.Status.IN_REVIEW,
                    Request.Status.IN_PROGRESS,
                ],
            ).count(),
        }

        cache.set(cache_key, data, timeout=self.CACHE_TTL)

        return Response(
            {
                "success": True,
                "data": data,
                "cached": False,
            }
        )


class ActivityFeedView(APIView):
    permission_classes = [IsAuthenticated]
    PAGE_SIZE = settings.PAGE_SIZE

    def get(self, request):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        qs = self._build_queryset(request)
        cursor = request.query_params.get("cursor")

        if cursor:
            try:
                decoded = base64.b64decode(cursor.encode()).decode()
                ts, uid = decoded.split("|", 1)
                qs = qs.filter(
                    Q(created_at__lt=ts)
                    | Q(created_at=ts)
                    | Q(created_at=ts, id__lt=uid)
                )
            except Exception:
                return Response(
                    {"success": False, "message": "Invalid cursor."}, status=400
                )

        page = list(qs[: self.PAGE_SIZE + 1])
        has_next = len(page) > self.PAGE_SIZE
        page = page[: self.PAGE_SIZE]

        next_cursor = None
        if has_next and page:
            last = page[-1]
            raw = f"{last.created_at.isoformat()}|{last.id}"
            next_cursor = base64.b64encode(raw.encode()).decode()

        return Response(
            {
                "success": True,
                "data": {
                    "results": self._serialize(page),
                    "next_cursor": next_cursor,
                    "has_next": has_next,
                },
            }
        )

    def _build_queryset(self, request):
        tid = request.tenant.id
        p = request.query_params

        qs = (
            RequestActivity.objects.filter(tenant_id=tid)
            .filter(Q(request__isnull=True) | Q(request__client__is_deleted=False))
            .select_related(
                "actor", "request", "request__client", "request__client__user"
            )
            .order_by("-created_at", "-id")
        )

        if p.get("search"):
            qs = qs.filter(description__icontains=p["search"])

        if p.get("from_date"):
            qs = qs.filter(created_at__date__gte=p["from_date"])

        if p.get("to_date"):
            qs = qs.filter(created_at__date__lte=p["to_date"])

        if p.get("event_type"):
            qs = qs.filter(event_type=p["event_type"])

        if p.get("client_id"):
            qs = qs.filter(request__client_id=p["client_id"])

        return qs

    def _serialize(self, activities):
        current_user_id = self.request.user.id
        return [
            {
                "id": str(a.id),
                "event_type": a.event_type,
                "description": a.description,
                "actor_source": a.actor_source,
                "actor": a.actor.display_name if a.actor else None,
                "actor_avatar_url": a.actor.avatar_url if a.actor else None,
                "is_current_user": a.actor_id == current_user_id,
                "metadata": a.metadata,
                "created_at": a.created_at.isoformat(),
                "target_info": {
                    "request_id": str(a.request_id) if a.request_id else None,
                    "request_title": a.request.title if a.request else None,
                    "request_ref": (
                        f"#{str(a.request_id)[:8]}" if a.request_id else None
                    ),
                    "client_name": (
                        a.request.client.user.display_name
                        if a.request and a.request.client and a.request.client.user
                        else None
                    ),
                    "client_avatar_url": (
                        a.request.client.user.avatar_url
                        if a.request and a.request.client and a.request.client.user
                        else None
                    ),
                },
            }
            for a in activities
        ]


class ActivityExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _require_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        qs = ActivityFeedView._build_queryset(ActivityFeedView(), request)

        response = StreamingHttpResponse(self._stream_csv(qs), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="activity.csv"'
        return response

    def _stream_csv(self, qs):
        columns = [
            "id",
            "event_type",
            "description",
            "actor_source",
            "actor",
            "request_id",
            "request_title",
            "created_at",
        ]

        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(columns)
        yield buffer.getvalue()

        for a in qs.iterator(chunk_size=500):
            buffer = StringIO()
            writer = csv.writer(buffer)
            writer.writerow(
                [
                    str(a.id),
                    a.event_type,
                    a.description,
                    a.actor_source,
                    a.actor.display_name if a.actor else "",
                    str(a.request_id),
                    a.request.title if a.request else "",
                    a.created_at.isoformat(),
                ]
            )
            yield buffer.getvalue()
