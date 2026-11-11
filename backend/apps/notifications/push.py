"""Web Push delivery. Subscription endpoints are restricted to browser push services."""
import json
from urllib.parse import urlsplit

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.common.logger import logger
from .models import PushSubscription


def valid_endpoint(endpoint):
    try:
        url = urlsplit(endpoint)
        host = url.hostname or ''
        return (url.scheme == 'https' and not url.username and not url.password
                and url.port in (None, 443) and not url.fragment
                and (host == 'fcm.googleapis.com' or host == 'updates.push.services.mozilla.com'
                     or host == 'web.push.apple.com' or host.endswith('.push.apple.com')))
    except ValueError:
        return False


def push_enabled():
    return bool(settings.WEB_PUSH_PUBLIC_KEY and settings.WEB_PUSH_PRIVATE_KEY and settings.WEB_PUSH_SUBJECT)


@shared_task
def deliver_push(tenant_id, user_id, payload, ttl=300):
    if not push_enabled():
        return
    from pywebpush import webpush, WebPushException
    # Keep encrypted previews within push services' payload limits, including Unicode.
    payload = {**payload, 'title': str(payload.get('title', 'Workspace update'))[:120],
               'body': str(payload.get('body', ''))[:240]}
    if payload.get('expires_at') and payload['expires_at'] <= timezone.now().timestamp() * 1000:
        return
    if payload.get('kind') == 'call' and payload.get('request_id'):
        from apps.chat.call_sessions import current
        pending = current(payload['request_id'])
        if not pending or pending['call_id'] != payload.get('call_id'):
            return
    subscriptions = PushSubscription.objects.filter(tenant_id=tenant_id, user_id=user_id,
        user__is_active=True, tenant__memberships__user_id=user_id,
        tenant__memberships__is_active=True).distinct()
    for subscription in subscriptions:
        if not valid_endpoint(subscription.endpoint):
            continue
        try:
            webpush(subscription_info={'endpoint': subscription.endpoint, 'keys': subscription.keys},
                    data=json.dumps(payload), vapid_private_key=settings.WEB_PUSH_PRIVATE_KEY,
                    vapid_claims={'sub': settings.WEB_PUSH_SUBJECT}, ttl=ttl,
                    headers={'Urgency': 'high' if payload.get('kind') == 'call' else 'normal'}, timeout=10)
        except WebPushException as exc:
            if exc.response is not None and exc.response.status_code in (404, 410):
                subscription.delete()
            else:
                logger.warning('Web Push delivery failed (subscription %s)', subscription.pk)
        except Exception:
            logger.exception('Web Push delivery failed (subscription %s)', subscription.pk)
