from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.common.logger import logger
from apps.settings.repositories import UserSettingsRepository

from .models import Notification


def get_feed_group_name(user_id):
    return f"feed_{user_id}"


_IN_APP_PREF_KEY = {
    Notification.EventType.NEW_REQUEST: "new_request",
    Notification.EventType.NEW_MESSAGE: "client_reply",
    Notification.EventType.INVITE_ACCEPTED: "client_accepted_invite",
    Notification.EventType.FILES_DELIVERED: "client_viewed_delivery",
    Notification.EventType.REQUEST_OVERDUE: "request_overdue",
}


def _wants_in_app(user, event_type):
    """
    Returns False only if the user has explicitly toggled off
    the in_app preference for this event type.
    Defaults to True for any event type not in the map.
    """

    key = _IN_APP_PREF_KEY.get(event_type)
    if key is None:
        return True
    in_app_prefs = UserSettingsRepository.get_notification_settings(user).get(
        "in_app", {}
    )
    return in_app_prefs.get(key, True)


def create_notification(
    *,
    tenant,
    recipient,
    event_type,
    title,
    body,
    related_request=None,
    related_client=None,
    new_status=None,
):
    """
    Creates a Notification record and pushes it over WebSocket,
    unless the recipient has opted out of in-app for this event type.
    """
    if not _wants_in_app(recipient, event_type):
        logger.info(
            f"[create_notification] Skipped (in-app opted out): "
            f"user={recipient.email} event={event_type}"
        )
        return None

    notification = Notification.objects.create(
        tenant=tenant,
        recipient=recipient,
        event_type=event_type,
        title=title,
        body=body,
        related_request=related_request,
        related_client=related_client,
    )

    payload = {
        "type": "feed.notification",
        "notification_id": str(notification.id),
        "event_type": notification.event_type,
        "title": notification.title,
        "body": notification.body,
        "related_request_id": str(related_request.id) if related_request else None,
        "related_client_id": str(related_client.id) if related_client else None,
        "is_read": False,
        "created_at": notification.created_at.isoformat(),
        "new_status": new_status,
        "updated_at": (
            related_request.updated_at.isoformat() if related_request else None
        ),
    }

    group_name = get_feed_group_name(str(recipient.id))

    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception as e:
        logger.error(
            f"[create_notification] WebSocket push failed for {recipient.email}: {e}"
        )

    return notification


def push_activity(*, activity, provider_id):
    """
    Pushes a RequestActivity event over WebSocket to the provider's feed group.
    No DB write — activity record already exists. No pref check needed.
    """
    payload = {
        "type": "feed.activity",
        "id": str(activity.id),
        "event_type": activity.event_type,
        "description": activity.description,
        "actor_source": activity.actor_source,
        "actor": activity.actor.display_name if activity.actor else None,
        "request_id": str(activity.request_id),
        "request_title": (
            activity.request.title if hasattr(activity, "request") else None
        ),
        "metadata": activity.metadata,
        "created_at": activity.created_at.isoformat(),
    }

    group_name = get_feed_group_name(str(provider_id))

    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception as e:
        logger.error(
            f"[push_activity] WebSocket push failed for provider {provider_id}: {e}"
        )
