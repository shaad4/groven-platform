import uuid

from django.db import models


class Plan(models.Model):
    """Subscription plan. Seeded via data migration (free + pro)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    client_limit = models.IntegerField(default=3)
    request_limit = models.IntegerField(default=10)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    stripe_price_id = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "plans"
        indexes = [models.Index(fields=["name"], name="idx_plans_name")]

    def __str__(self):
        return self.name


class Tenant(models.Model):
    """
    One tenant = one service provider's workspace.
    Identified on every request by subdomain slug (e.g. arjundev.groven.in).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="tenants")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=63, unique=True)
    logo_url = models.TextField(null=True, blank=True)
    tagline = models.CharField(max_length=255, null=True, blank=True)
    accent_color = models.CharField(
        max_length=7, null=True, blank=True, default="#0F8536"
    )
    is_active = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)
    white_label_enabled = models.BooleanField(default=False)
    custom_status_labels = models.JSONField(null=True, blank=True)
    client_limit_override = models.IntegerField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants"
        indexes = [
            models.Index(fields=["slug"], name="idx_tenants_slug"),
            models.Index(fields=["plan"], name="idx_tenants_plan_id"),
            models.Index(fields=["is_active"], name="idx_tenants_is_active"),
        ]

    def __str__(self):
        return f"{self.name} ({self.slug})"

    @property
    def effective_client_limit(self):
        if self.client_limit_override is not None:
            return self.client_limit_override
        return self.plan.client_limit

    @property
    def effective_request_limit(self):
        return self.plan.request_limit

    @property
    def is_pro(self):
        """Single source of truth for Pro-gated features (AI, etc)"""
        return self.plan.name == "pro"


class TenantMembership(models.Model):
    """
    user can have multiple memberships (one per tenant they belong to).
    Role is stored here, not on the user.
    The middleware validates membership on every authenticated request.
    """

    class Role(models.TextChoices):
        PROVIDER = "provider", "Provider"
        CLIENT = "client", "Client"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tenant_memberships"
        constraints = [
            # A user can only have one membership per tenant
            models.UniqueConstraint(
                fields=["user", "tenant"],
                name="idx_memberships_user_tenant",
            )
        ]
        indexes = [
            models.Index(fields=["tenant"], name="idx_memberships_tenant_id"),
            models.Index(fields=["role"], name="idx_memberships_role"),
        ]

    def __str__(self):
        return f"{self.user.email} → {self.tenant.slug} ({self.role})"


class TenantUsage(models.Model):
    """
    Denormalized counters for fast plan-limit enforcement.
    Updated by signals / Celery tasks, never calculated live.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant, on_delete=models.CASCADE, related_name="usage"
    )
    client_count = models.IntegerField(default=0)
    active_request_count = models.IntegerField(default=0)
    total_requests_lifetime = models.IntegerField(default=0)
    total_delivered_lifetime = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_usage"
        indexes = [models.Index(fields=["tenant"], name="idx_tenant_usage_tenant_id")]

    def __str__(self):
        return f"Usage({self.tenant.slug})"


class BillingHistory(models.Model):
    """Invoice/payment record synced from Stripe webhook events"""

    class Status(models.TextChoices):
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        PENDING = "pending", "Pending"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="billing_history"
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name="billing_history"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    stripe_invoice_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices)
    period_start = models.DateField()
    period_end = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_history"
        indexes = [
            models.Index(fields=["tenant"], name="idx_billing_history_tenant_id"),
            models.Index(fields=["plan"], name="idx_billing_history_plan_id"),
            models.Index(fields=["status"], name="idx_billing_history_status"),
            models.Index(fields=["created_at"], name="idx_billing_history_created_at"),
        ]

    def __str__(self):
        return f"{self.tenant.slug} — {self.amount} {self.currency} ({self.status})"
