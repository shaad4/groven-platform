import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.tenants.models import Tenant

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")

RESERVED_SLUGS = {
    "www",
    "api",
    "admin",
    "grove",
    "app",
    "mail",
    "static",
    "assets",
    "cdn",
    "support",
    "help",
    "billing",
}

STATUS_KEYS = {"received", "in_review", "in_progress", "delivered", "closed"}

VALID_SUMMARY_DAYS = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}

# Profile


class DisplayNameSerializer(serializers.Serializer):
    display_name = serializers.CharField(min_length=2, max_length=60)

    def validate_display_name(self, value):
        return value.strip()


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric.")
        validate_password(value)
        return value

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return data


# Workspace


class WorkspaceUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=255, required=False)
    tagline = serializers.CharField(max_length=255, required=False, allow_blank=True)
    slug = serializers.CharField(min_length=3, max_length=63, required=False)
    accent_color = serializers.CharField(max_length=7, required=False)
    white_label_enabled = serializers.BooleanField(required=False)
    custom_status_labels = serializers.DictField(
        child=serializers.CharField(max_length=50),
        required=False,
    )

    def validate_slug(self, value):
        value = value.lower().strip()
        if not SLUG_PATTERN.match(value):
            raise serializers.ValidationError(
                "Slug must contain only lowercase letters, numbers and hyphens."
            )
        if value in RESERVED_SLUGS:
            raise serializers.ValidationError("This slug is reserved.")
        return value

    def validate_accent_color(self, value):
        if not HEX_COLOR_PATTERN.match(value):
            raise serializers.ValidationError(
                "Accent color must be a valid hex code (e.g. #0F6E56)."
            )
        return value

    def validate_custom_status_labels(self, value):
        invalid = set(value.keys()) - STATUS_KEYS
        if invalid:
            raise serializers.ValidationError(
                f"Invalid status keys: {', '.join(invalid)}. "
                f"Allowed: {', '.join(STATUS_KEYS)}."
            )
        return value


# Notification


class ProviderInAppNotificationSerializer(serializers.Serializer):
    new_request = serializers.BooleanField(required=False)
    client_reply = serializers.BooleanField(required=False)
    client_viewed_delivery = serializers.BooleanField(required=False)
    client_accepted_invite = serializers.BooleanField(required=False)
    request_overdue = serializers.BooleanField(required=False)


class ProviderEmailNotificationSerializer(serializers.Serializer):
    new_request = serializers.BooleanField(required=False)
    client_reply = serializers.BooleanField(required=False)
    client_viewed_delivery = serializers.BooleanField(required=False)
    client_accepted_invite = serializers.BooleanField(required=False)
    weekly_summary = serializers.BooleanField(required=False)
    weekly_summary_day = serializers.ChoiceField(
        choices=list(VALID_SUMMARY_DAYS), required=False
    )


class ProviderNotificationSerializer(serializers.Serializer):
    in_app = ProviderInAppNotificationSerializer(required=False)
    email = ProviderEmailNotificationSerializer(required=False)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("No notification preferences provided.")
        return data

    def to_internal_value(self, data):
        result = super().to_internal_value(data)
        flat = {}
        if "in_app" in result:
            flat["in_app"] = dict(result["in_app"])
        if "email" in result:
            flat["email"] = dict(result["email"])
        return flat


class ClientEmailNotificationSerializer(serializers.Serializer):
    status_change = serializers.BooleanField(required=False)
    new_message = serializers.BooleanField(required=False)
    files_delivered = serializers.BooleanField(required=False)


class ClientNotificationSerializer(serializers.Serializer):
    email = ClientEmailNotificationSerializer(required=False)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("No notification preferences provided.")
        return data

    def to_internal_value(self, data):
        result = super().to_internal_value(data)
        flat = {}
        if "email" in result:
            flat["email"] = dict(result["email"])
        return flat
