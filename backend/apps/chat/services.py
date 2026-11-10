from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import DatabaseError

from apps.common.logger import logger
from apps.notifications.models import Notification
from apps.notifications.utils import create_notification
from apps.request_management.services import FileService

from .models import Message as MessageModel
from .repositories import MessageRepository


def get_chat_group_name(request_id):
    return f"chat_{request_id}"


def create_message(request_obj, sender, content, attachment_ids=None):
    try:
        message = MessageRepository.create(request_obj, sender, content, attachment_ids)
        _broadcast_message(message)
        _notify_other_party(request_obj, sender)
        return message
    except DatabaseError as e:
        logger.error(f"[ChatService.create_message] Failed to create message: {e}")
        raise


def _notify_other_party(request_obj, sender):
    """
    If sender is the client  → notify the provider.
    If sender is the provider → notify the client.
    Wrapped in try/except so a push failure never breaks message creation.
    """
    try:
        client_user = request_obj.client.user
        provider_user = request_obj.provider

        recipient = provider_user if sender == client_user else client_user

        if not recipient or recipient == sender:
            return

        create_notification(
            tenant=request_obj.tenant,
            recipient=recipient,
            event_type=Notification.EventType.NEW_MESSAGE,
            title="New Message",
            body=f'{sender.display_name} sent a message on "{request_obj.title}".',
            related_request=request_obj,
            related_client=request_obj.client,
        )
    except Exception as e:
        logger.error(f"[ChatService._notify_other_party] Error: {e}")


def mark_messages_read(request_obj, reader):
    try:
        updated = MessageRepository.mark_read(request_obj, exclude_sender=reader)
        if updated:
            _broadcast_read_receipt(request_obj, str(reader.id))
        return updated
    except Exception as e:
        logger.error(f"[ChatService.mark_messages_read] Error: {e}")
        return 0


def _broadcast_message(message):
    try:
        message = MessageModel.objects.prefetch_related("attachments__file").get(
            id=message.id
        )

        channel_layer = get_channel_layer()
        group_name = get_chat_group_name(str(message.request_id))

        attachments = []
        for a in message.attachments.select_related("file").all():
            attachments.append(
                {
                    "id": str(a.file.id),
                    "file_name": a.file.file_name,
                    "file_type": a.file.file_type,
                    "file_size_bytes": a.file.file_size_bytes,
                    "download_url": FileService.generate_download_url(a.file.s3_key),
                }
            )

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "chat.message",
                "id": str(message.id),
                "request_id": str(message.request_id),
                "sender_id": str(message.sender_id),
                "sender_name": message.sender.display_name,
                "sender_email": message.sender.email,
                "content": message.content,
                "attachments": attachments,
                "is_read": message.is_read,
                "created_at": message.created_at.isoformat(),
            },
        )
    except Exception as e:
        logger.error(f"[ChatService._broadcast_message] Channel layer error: {e}")


def _broadcast_read_receipt(request_obj, reader_id):
    try:
        channel_layer = get_channel_layer()
        group_name = get_chat_group_name(str(request_obj.id))
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "chat.read_receipt",
                "request_id": str(request_obj.id),
                "reader_id": reader_id,
            },
        )
    except Exception as e:
        logger.error(f"[ChatService._broadcast_read_receipt] Channel layer error: {e}")
