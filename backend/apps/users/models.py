import uuid

from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        PermissionsMixin)
from django.db import models


class UserManager(BaseUserManager):
    """
    Custom manager for the global User model.
    No tenant or role here — those live in TenantMembership.
    """

    def create_user(self, email, password, is_active=False, **extra):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, is_active=is_active, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_active", True)
        extra.setdefault("is_email_verified", True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Global identity model — one account per email address across all of Groven.

    Role is NOT stored here. A user's role is resolved from TenantMembership
    at login time for a specific tenant. This is the core of the v2 architecture.

    Old model had: tenant FK, role field, unique_together(tenant, email)
    New model has: globally unique email, no tenant, no role
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)  # globally unique now
    display_name = models.CharField(max_length=255)
    avatar_url = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    settings = models.JSONField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["display_name"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"], name="idx_users_email"),
            models.Index(fields=["is_active"], name="idx_users_active"),
        ]

    def __str__(self):
        return self.email


class EmailVerificationToken(models.Model):
    """One-time token emailed to a new user to verify their address."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        USED = "used", "Used"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="verification_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verification_tokens"

    def __str__(self):
        return f"VerifyToken({self.user.email}, {self.status})"


class PasswordResetToken(models.Model):
    """Short-lived token for password reset flows (provider and client share this)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        USED = "used", "Used"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_reset_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"
        indexes = [
            models.Index(fields=["token"], name="idx_prt_token"),
            models.Index(fields=["user"], name="idx_prt_user"),
            models.Index(fields=["status"], name="idx_prt_status"),
            models.Index(fields=["expires_at"], name="idx_prt_expires"),
        ]

    def __str__(self):
        return f"ResetToken({self.user.email}, {self.status})"
