import uuid

from django.db import models

from apps.tenants.models import Tenant, TenantMembership
from apps.users.models import User

# Create your models here.


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="tags")
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tags"
        unique_together = [("tenant", "name")]
        indexes = [
            models.Index(fields=["tenant", "name"], name="idx_tags_tenant_name"),
        ]

    def __str__(self):
        return f"{self.name} ({self.tenant.slug})"


class Client(models.Model):
    """
    Represents a client account within a tenant's workspace.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="clients",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="client_profiles",
        null=True,
        blank=True,
    )

    membership = models.OneToOneField(
        TenantMembership,
        on_delete=models.CASCADE,
        related_name="client_profile",
        null=True,
        blank=True,
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="managed_clients",
    )

    client_name = models.CharField(max_length=255, blank=True, default="")
    client_email = models.EmailField(blank=True, default="")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    business_type = models.CharField(max_length=100, null=True, blank=True)
    private_note = models.TextField(null=True, blank=True)

    is_deactivated = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    joined_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clients"
        indexes = [
            models.Index(fields=["tenant"], name="idx_clients_tenant_id"),
            models.Index(fields=["provider"], name="idx_clients_provider_id"),
            models.Index(fields=["status"], name="idx_clients_status"),
            models.Index(fields=["is_deleted"], name="idx_clients_deleted"),
            models.Index(fields=["is_deactivated"], name="idx_clients_deactivated"),
        ]

    def __str__(self):
        if self.user:
            return f"{self.user.display_name} @ {self.tenant.slug}"
        return f"Pending client @ {self.tenant.slug}"


class ClientTagMap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=True)
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="tag_maps"
    )
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="client_maps")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_tag_map"
        unique_together = [("client", "tag")]
        indexes = [
            models.Index(fields=["client"], name="idx_client_tag_map_client"),
            models.Index(fields=["tag"], name="idx_client_tag_map_tag"),
        ]


class Invite(models.Model):
    """
    Tracks a pending client invite sent by a provider.
    Token is emailed to the client; used to accept and activate their account.
        - If their email already exists globally - create membership only
        - If their email is new - create User + membership in one transaction
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_invites",
    )

    client_email = models.EmailField()
    client_name = models.CharField(max_length=255)

    # unique token
    token = models.UUIDField(default=uuid.uuid4, unique=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "invites"
        indexes = [
            models.Index(fields=["token"], name="idx_invites_token"),
            models.Index(fields=["tenant"], name="idx_invites_tenant_id"),
            models.Index(fields=["client_email"], name="idx_invites_client_email"),
            models.Index(fields=["expires_at"], name="idx_invites_expires_at"),
        ]

    def __str__(self):
        return f"Invite → {self.client_email} [{self.status}]"
