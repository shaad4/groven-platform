import uuid

from django.db import models

from apps.users.models import User


class AdminAction(models.Model):
    """Audit log every mutating Groven Admin action writes one row here."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="admin_actions"
    )
    action_type = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50)
    target_id = models.UUIDField()
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "admin_actions"
        indexes = [
            models.Index(fields=["admin"], name="idx_admin_actions_admin_id"),
            models.Index(fields=["target_id"], name="idx_admin_actions_target_id"),
            models.Index(fields=["action_type"], name="idx_admin_actions_type"),
            models.Index(fields=["created_at"], name="idx_admin_actions_created_at"),
        ]

    def __str__(self):
        return f"{self.action_type} on {self.target_type}:{self.target_id}"
