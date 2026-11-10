import uuid

from django.db import models

from apps.request_management.models import File, Request
from apps.tenants.models import Tenant
from apps.users.models import User

# Create your models here.


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="messages"
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    content = models.TextField(blank=True, default="")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        indexes = [
            models.Index(fields=["request"], name="idx_messages_request_id"),
            models.Index(fields=["tenant"], name="idx_messages_tenant_id"),
            models.Index(fields=["sender"], name="idx_messages_sender_id"),
            models.Index(
                fields=["request", "created_at"], name="idx_messages_request_tl"
            ),
            models.Index(
                fields=["request", "is_read"], name="idx_messages_request_unread"
            ),
        ]

    def __str__(self):
        return f"Message by {self.sender.email} on request {self.request_id}"


class MessageAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.ForeignKey(
        File, on_delete=models.CASCADE, related_name="message_attachments"
    )

    class Meta:
        db_table = "message_attachments"
        indexes = [
            models.Index(fields=["message"], name="idx_msg_attachments_message_id"),
            models.Index(fields=["file"], name="idx_msg_attachments_file_id"),
        ]

    def __str__(self):
        return f"Attachment on message {self.message_id}"
