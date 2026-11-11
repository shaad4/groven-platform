from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.permissions import BelongsToTenant

from .models import Notification

# Create your views here.


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated, BelongsToTenant]

    def get(self, request):
        tenant = request.tenant
        qs = Notification.objects.filter(
            tenant=tenant,
            recipient=request.user,
        ).select_related("related_request", "related_client")

        if tenant:
            qs = qs.filter(tenant=tenant)

        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)

        # Cap at last 50
        qs = qs[:50]

        data = [
            {
                "id": str(n.id),
                "event_type": n.event_type,
                "title": n.title,
                "body": n.body,
                "related_request_id": (
                    str(n.related_request_id) if n.related_request_id else None
                ),
                "related_client_id": (
                    str(n.related_client_id) if n.related_client_id else None
                ),
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs
        ]
        return Response(data)


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated, BelongsToTenant]

    def post(self, request, pk):
        updated = Notification.objects.filter(
            id=pk,
            tenant=request.tenant,
            recipient=request.user,
        ).update(is_read=True, read_at=timezone.now())

        if not updated:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"detail": "Marked as read."})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated, BelongsToTenant]

    def post(self, request):
        Notification.objects.filter(
            tenant=request.tenant,
            recipient=request.user,
            is_read=False,
        ).update(is_read=True, read_at=timezone.now())

        return Response({"detail": "All notifications marked as read."})


class PushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, BelongsToTenant]

    def get(self, request):
        from django.conf import settings
        from .push import push_enabled
        return Response({'enabled': push_enabled(), 'public_key': settings.WEB_PUSH_PUBLIC_KEY if push_enabled() else ''})

    def post(self, request):
        import base64
        from .models import PushSubscription
        from .push import valid_endpoint, push_enabled
        if not push_enabled():
            return Response({'detail': 'Device notifications are not configured yet.'}, status=503)
        endpoint = request.data.get('endpoint', '')
        keys = request.data.get('keys', {})
        try:
            if not isinstance(endpoint, str) or len(endpoint) > 2048 or not valid_endpoint(endpoint):
                raise ValueError()
            if not isinstance(keys, dict):
                raise ValueError()
            for key, length in [('p256dh', 65), ('auth', 16)]:
                value = keys.get(key, '')
                if not isinstance(value, str) or len(value) > 128 or len(base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))) != length:
                    raise ValueError()
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid push subscription.'}, status=400)
        PushSubscription.objects.update_or_create(endpoint=endpoint, defaults={
            'user': request.user, 'tenant': request.tenant,
            'keys': {key: keys[key] for key in ('p256dh', 'auth')},
        })
        return Response({'detail': 'Device notifications enabled.'}, status=201)

    def delete(self, request):
        from .models import PushSubscription
        PushSubscription.objects.filter(user=request.user, tenant=request.tenant,
            endpoint=request.data.get('endpoint', '')).delete()
        return Response(status=204)
