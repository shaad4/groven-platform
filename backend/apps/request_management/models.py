import uuid

from django.db import models

from apps.clients.models import Client
from apps.tenants.models import Tenant
from apps.users.models import User

# Create your models here.


class Request(models.Model):

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        IN_REVIEW = "in_review", "In Review"
        IN_PROGRESS = "in_progress", "In Progress"
        DELIVERED = "delivered", "Delivered"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="requests"
    )
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="requests"
    )
    provider = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="handled_requests"
    )

    title = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.RECEIVED
    )

    # AI Fields (Latter)
    ai_summary = models.TextField(null=True, blank=True)
    ai_category = models.CharField(max_length=50, null=True, blank=True)

    is_urgent = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    overdue_notified_at = models.DateTimeField(null=True, blank=True)

    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "requests"
        indexes = [
            models.Index(fields=["tenant"], name="idx_requests_tenant_id"),
            models.Index(fields=["client"], name="idx_requests_client_id"),
            models.Index(fields=["provider"], name="idx_requests_provider_id"),
            models.Index(fields=["status"], name="idx_requests_status"),
            models.Index(
                fields=["tenant", "status"], name="idx_requests_tenant_status"
            ),
            models.Index(
                fields=["tenant", "client", "status"], name="idx_requests_tcs"
            ),
            models.Index(fields=["is_deleted"], name="idx_requests_deleted"),
            models.Index(fields=["created_at"], name="idx_requests_created_at"),
            models.Index(fields=["due_date"], name="idx_requests_due_date"),
            models.Index(fields=["ai_category"], name="idx_requests_ai_category"),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title[:60]}"


class RequestActivity(models.Model):

    class ActorSource(models.TextChoices):
        USER = "user", "User"
        SYSTEM = "system", "System"
        AI = "ai", "AI"

    class EventType(models.TextChoices):
        REQUEST_CREATED = "request_created", "Request Created"
        STATUS_CHANGE = "status_change", "Status Change"
        MESSAGE_SENT = "message_sent", "Message Sent"
        FILE_UPLOADED = "file_uploaded", "File Uploaded"
        NOTE_ADDED = "note_added", "Note Added"
        DELIVERY_CREATED = "delivery_created", "Delivery Created"
        AI_SUMMARY_GENERATED = "ai_summary_generated", "AI Summary Generated"
        FLAG_TOGGLED = "flag_toggled", "Flag Toggled"
        DUE_DATE_SET = "due_date_set", "Due Date Set"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="activities"
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="request_activities"
    )
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activities",
    )
    actor_source = models.CharField(max_length=20, choices=ActorSource.choices)
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    description = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "request_activities"
        indexes = [
            models.Index(fields=["request"], name="idx_req_activities_request_id"),
            models.Index(fields=["tenant"], name="idx_req_activities_tenant_id"),
            models.Index(fields=["event_type"], name="idx_req_activities_event_type"),
            models.Index(
                fields=["request", "created_at"], name="idx_req_activities_req_tl"
            ),
            models.Index(
                fields=["tenant", "created_at"], name="idx_req_activities_tenant_tl"
            ),
        ]

    def __str__(self):
        return f"{self.event_type} on {self.id}"


class InternalNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="internal_notes"
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="internal_notes"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="internal_notes"
    )
    content = models.TextField()
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "internal_notes"
        indexes = [
            models.Index(fields=["request"], name="idx_internal_notes_request_id"),
            models.Index(fields=["tenant"], name="idx_internal_notes_tenant_id"),
            models.Index(fields=["user"], name="idx_internal_notes_user_id"),
            models.Index(
                fields=["request", "is_ai_generated"], name="idx_internal_notes_req_ai"
            ),
        ]

    def __str__(self):
        return f"Note by {self.user} on {self.id}"


class Delivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="deliveries"
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="deliveries"
    )
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deliveries"
    )
    message = models.TextField(null=True, blank=True)
    links = models.JSONField(
        null=True, blank=True
    )  # [{"label": "Figma", "url": "..."}]
    delivery_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deliveries"
        indexes = [
            models.Index(fields=["request"], name="idx_deliveries_request_id"),
            models.Index(fields=["tenant"], name="idx_deliveries_tenant_id"),
            models.Index(fields=["created_by"], name="idx_deliveries_created_by_id"),
            models.Index(
                fields=["request", "delivery_number"], name="idx_deliveries_req_number"
            ),
        ]

    def __str__(self):
        return f"Delivery #{self.delivery_number} for {self.id}"


class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="files")
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name="files")
    delivery = models.ForeignKey(
        Delivery, on_delete=models.SET_NULL, null=True, blank=True, related_name="files"
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="uploaded_files"
    )

    file_name = models.CharField(max_length=500)
    file_url = models.TextField()
    s3_key = models.TextField()
    file_size_bytes = models.BigIntegerField()
    file_type = models.CharField(max_length=100)  # MIME type
    file_extension = models.CharField(max_length=20)

    is_delivery_file = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "files"
        indexes = [
            models.Index(fields=["tenant"], name="idx_files_tenant_id"),
            models.Index(fields=["request"], name="idx_files_request_id"),
            models.Index(fields=["uploaded_by"], name="idx_files_uploaded_by_id"),
            models.Index(
                fields=["request", "is_delivery_file"],
                name="idx_files_request_delivery",
            ),
            models.Index(fields=["is_deleted"], name="idx_files_deleted"),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.id})"
