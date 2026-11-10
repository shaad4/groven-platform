from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.common.logger import logger

from .utils import get_feed_group_name


class NotificationFeedConsumer(AsyncJsonWebsocketConsumer):
    """
    One consumer for both providers and clients.
    The ws_middleware already validated JWT + tenant membership
    before this connect() is called, so scope["user"] and
    scope["tenant_membership"] are guaranteed to be set.
    """

    async def connect(self):
        self.user = self.scope["user"]
        self.tenant = self.scope["tenant"]
        self.membership = self.scope["tenant_membership"]
        self.group_name = get_feed_group_name(str(self.user.id))

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info(
            f"[NotificationFeedConsumer] {self.user.email} "
            f"({self.membership.role}) connected — group {self.group_name}"
        )

    async def disconnect(self, code):
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )
                logger.info(
                    f"[NotificationFeedConsumer] {self.user.email} disconnected (code={code})"
                )
        except Exception as e:
            logger.error(f"[NotificationFeedConsumer.disconnect] Error: {e}")

    async def receive_json(self, content):
        # Only ping/pong from client side
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def feed_notification(self, event):
        try:
            await self.send_json(
                {
                    "type": "notification",
                    "notification_id": event["notification_id"],
                    "event_type": event["event_type"],
                    "title": event["title"],
                    "body": event["body"],
                    "related_request_id": event["related_request_id"],
                    "related_client_id": event["related_client_id"],
                    "is_read": event["is_read"],
                    "created_at": event["created_at"],
                    "new_status": event.get("new_status"),
                    "updated_at": event.get("updated_at"),
                }
            )
        except Exception as e:
            logger.error(f"[NotificationFeedConsumer.feed_notification] Error: {e}")

    async def feed_activity(self, event):
        try:
            await self.send_json(
                {
                    "type": "activity",
                    "id": event["id"],
                    "event_type": event["event_type"],
                    "description": event["description"],
                    "actor_source": event["actor_source"],
                    "actor": event["actor"],
                    "request_id": event["request_id"],
                    "request_title": event["request_title"],
                    "metadata": event["metadata"],
                    "created_at": event["created_at"],
                }
            )
        except Exception as e:
            logger.error(f"[NotificationFeedConsumer.feed_activity] Error: {e}")
