from django.db import DatabaseError
from django.utils import timezone

from apps.common.logger import logger
from apps.request_management.models import File

from .models import Message, MessageAttachment


class MessageRepository:

    @staticmethod
    def get_for_request(request_id, tenant_id):
        try:
            return (
                Message.objects.filter(request_id=request_id, tenant_id=tenant_id)
                .select_related("sender")
                .prefetch_related("attachments__file")
                .order_by("created_at")
            )
        except DatabaseError as e:
            logger.error(f"[MessageRepository.get_for_request] DB error: {e}")
            return Message.objects.none()

    @staticmethod
    def get_by_id(message_id, tenant_id):
        try:
            return Message.objects.select_related("sender").get(
                id=message_id,
                tenant_id=tenant_id,
            )
        except Message.DoesNotExist:
            return None
        except DatabaseError as e:
            logger.error(f"[MessageRepository.get_by_id] DB error: {e}")
            return None

    @staticmethod
    def create(request_obj, sender, content, attachment_ids=None):
        try:
            message = Message.objects.create(
                request=request_obj,
                tenant=request_obj.tenant,
                sender=sender,
                content=content,
            )
            if attachment_ids:
                files = File.objects.filter(
                    id__in=attachment_ids,
                    tenant=request_obj.tenant,
                    request=request_obj,
                    is_deleted=False,
                )
                for file_obj in files:
                    MessageAttachmentRepository.create(message, file_obj)
            return message

        except DatabaseError as e:
            logger.error(f"[MessageRepository.create] DB error: {e}")
            raise

    @staticmethod
    def mark_read(request_obj, exclude_sender):
        """Mark all unread messages not sent by exclude_sender as read."""
        try:
            return (
                Message.objects.filter(request=request_obj, is_read=False)
                .exclude(sender=exclude_sender)
                .update(is_read=True, read_at=timezone.now())
            )
        except DatabaseError as e:
            logger.error(f"[MessageRepository.mark_read] DB error: {e}")
            return 0

    @staticmethod
    def get_unread_count(request_id, exclude_sender_id):
        try:
            return (
                Message.objects.filter(
                    request_id=request_id,
                    is_read=False,
                )
                .exclude(sender_id=exclude_sender_id)
                .count()
            )
        except DatabaseError as e:
            logger.error(f"[MessageRepository.get_unread_count] DB error: {e}")
            return 0


class MessageAttachmentRepository:

    @staticmethod
    def create(message, file_obj):
        try:
            return MessageAttachment.objects.create(
                message=message,
                file=file_obj,
            )
        except DatabaseError as e:
            logger.error(f"[MessageAttachmentRepository.create] DB error: {e}")
            raise
