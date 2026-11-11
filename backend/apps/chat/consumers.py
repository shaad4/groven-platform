from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.common.logger import logger
from apps.request_management.models import Request

from .access import get_chat_request
from .services import get_chat_group_name


class RequestChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.request_id = self.scope["url_route"]["kwargs"]["request_id"]
        self.group_name = get_chat_group_name(self.request_id)
        self.user = self.scope["user"]
        self.tenant = self.scope["tenant"]

        try:
            request_obj = await self._get_request()
            if request_obj is None:
                logger.warning(
                    f"[RequestChatConsumer] Request {self.request_id} not found "
                    f"for tenant {self.tenant.slug}"
                )
                await self.close(code=4004)
                return

            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            from .call_sessions import current
            pending = await database_sync_to_async(current)(self.request_id)
            if pending and pending['recipient_id'] == str(self.user.id):
                await self.send_json(pending['offer'])
                for candidate in pending['candidates']:
                    await self.send_json({'type': 'ice_candidate', 'call_id': pending['call_id'], 'candidate': candidate})
            logger.info(
                f"[RequestChatConsumer] {self.user.email} connected to "
                f"chat {self.request_id}"
            )

        except Exception as e:
            logger.error(f"[RequestChatConsumer.connect] Unexpected error: {e}")
            await self.close(code=4000)

    async def disconnect(self, code):
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )
                logger.info(
                    f"[RequestChatConsumer] {self.user.email} disconnected "
                    f"from chat {self.request_id} (code={code})"
                )
        except Exception as e:
            logger.error(f"[RequestChatConsumer.disconnect] Error: {e}")

    async def receive_json(self, content):
        try:
            event = content.get("type")

            if event == "ping":
                await self.send_json({"type": "pong"})

            elif event in ("call_offer", "call_answer", "ice_candidate", "call_end", "call_busy", "call_media"):
                request_obj = await self._get_request()
                if request_obj is None:
                    return
                from .call_sessions import handle
                allowed, alert = await database_sync_to_async(handle)(request_obj, self.user, self.channel_name, content)
                if not allowed:
                    if event == 'call_offer':
                        await self.send_json({'type': 'call_busy', 'call_id': content.get('call_id')})
                    return
                if event in ('call_answer', 'call_end'):
                    from apps.notifications.utils import get_feed_group_name
                    for user_id in {str(self.user.id), str(request_obj.provider_id), str(request_obj.client.user_id)}:
                        await self.channel_layer.group_send(get_feed_group_name(user_id), {
                            'type': 'feed.call', 'payload': {'kind': 'call_closed', 'call_id': content.get('call_id')},
                            'tenant_id': str(self.tenant.id),
                        })
                if alert:
                    from apps.notifications.utils import get_feed_group_name
                    await self.channel_layer.group_send(get_feed_group_name(alert[0]), {
                        'type': 'feed.call', 'payload': alert[1], 'tenant_id': str(self.tenant.id),
                    })
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "call_signal",
                        "payload": content,
                        "sender_id": str(self.user.id),
                        "sender_channel": self.channel_name,
                    },
                )
        except Exception as e:
            logger.error(f"[RequestChatConsumer.receive_json] Error: {e}")

    # Group Event Handler
    async def chat_message(self, event):
        try:
            await self.send_json(
                {
                    "type": "message",
                    "id": event["id"],
                    "request_id": event["request_id"],
                    "sender_id": event["sender_id"],
                    "sender_name": event["sender_name"],
                    "sender_email": event["sender_email"],
                    "content": event["content"],
                    "attachments": event.get("attachments", []),
                    "is_read": event.get("is_read", False),
                    "created_at": event["created_at"],
                }
            )
        except Exception as e:
            logger.error(f"[RequestChatConsumer.chat_message] Error: {e}")

    async def chat_read_receipt(self, event):
        try:
            await self.send_json(
                {
                    "type": "read_receipt",
                    "request_id": event["request_id"],
                    "reader_id": event["reader_id"],
                }
            )
        except Exception as e:
            logger.error(f"[RequestChatConsumer.chat_read_receipt] Error: {e}")

    async def call_signal(self, event):
        try:
            if event.get("sender_channel") == self.channel_name:
                return
            same_user = event["sender_id"] == str(self.user.id)
            if same_user and event["payload"].get("type") not in ("call_answer", "call_end"):
                return
            # Sibling tabs dismiss duplicate incoming calls when one tab answers
            # or declines. Channel identity stays within the channel layer.
            payload = {key: value for key, value in event["payload"].items() if key != "sender_channel"}
            await self.send_json({**payload, "same_user": same_user})
        except Exception as e:
            logger.error(f"[RequestChatConsumer.call_signal] Error: {e}")

    # DB Helper
    @database_sync_to_async
    def _get_request(self):
        try:
            return get_chat_request(self.request_id, self.tenant, self.user)
        except Request.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"[RequestChatConsumer._get_request] DB error: {e}")
            return None
