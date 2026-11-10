import uuid

from django.db import models

from apps.clients.models import Client
from apps.request_management.models import Request
from apps.tenants.models import Tenant
from apps.users.models import User

# Create your models here.


class Notification(models.Model):

    class EventType(models.TextChoices):
        NEW_REQUEST = "new_request", "New Request"
        STATUS_CHANGE = "status_change", "Status Change"
        NEW_MESSAGE = "new_message", "New Message"
        FILES_DELIVERED = "files_delivered", "Files Delivered"
        INVITE_ACCEPTED = "invite_accepted", "Invite Accepted"
        REQUEST_OVERDUE = "request_overdue", "Request Overdue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="notifications"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    related_request = models.ForeignKey(
        Request,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    related_client = models.ForeignKey(
        Client,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant"], name="idx_notifications_tenant_id"),
            models.Index(fields=["recipient"], name="idx_notifications_recipient_id"),
            models.Index(
                fields=["recipient", "is_read"], name="idx_notifi_recipient_unread"
            ),
            models.Index(
                fields=["tenant", "recipient", "created_at"], name="idx_notifi_feed"
            ),
            models.Index(fields=["event_type"], name="idx_notifications_event_type"),
            models.Index(
                fields=["related_request"], name="idx_notifications_request_id"
            ),
            models.Index(fields=["created_at"], name="idx_notifications_created_at"),
        ]

    def __str__(self):
        return f"[{self.event_type}] → {self.recipient.email}"
