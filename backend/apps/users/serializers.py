import re

import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.tenants.models import Tenant

from .models import EmailVerificationToken, PasswordResetToken, User
from .repositories import UserRepository


class EmailNotVerified(Exception):
    def __init__(self, user):
        self.user = user


class ProviderSignupSerializer(serializers.Serializer):
    display_name = serializers.CharField(min_length=2, max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    # validations

    def validate_email(self, value):
        value = value.lower().strip()

        existing = UserRepository.get_by_email(value)

        if existing:
            if existing.is_email_verified:
                raise serializers.ValidationError(
                    "An account with this email already exists."
                )

            if not existing.is_email_verified and not existing.is_active:
                existing.delete()

        return value

    def validate_password(self, value):
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric.")
        return value


SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$")

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


class WorkspaceSetupSerializer(serializers.Serializer):
    """Validates workspace name and slug when a new provider sets up their tenant."""

    business_name = serializers.CharField(min_length=2, max_length=255)
    slug = serializers.CharField(min_length=3, max_length=63)

    def validate_slug(self, value):
        value = value.lower().strip()

        if not SLUG_PATTERN.match(value):
            raise serializers.ValidationError(
                "Slug must contain only lowercase letters, numbers and hyphens."
            )

        if value in RESERVED_SLUGS:
            raise serializers.ValidationError("This slug is reserved.")

        if Tenant.objects.filter(slug=value, is_active=True).exists():
            raise serializers.ValidationError("This workspace URL is already taken.")

        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"].lower().strip()
        password = data["password"]

        user = UserRepository.get_by_email(email)

        if user is None or not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password")

        if not user.is_email_verified:
            raise EmailNotVerified(user)

        if not user.is_active:
            raise serializers.ValidationError("This account as been deactivated")

        data["user"] = user
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value


class GoogleAuthSerializer(serializers.Serializer):
    access_token = serializers.CharField(write_only=True)

    def validate_access_token(self, value):
        response = http_requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {value}"},
            timeout=10,
        )

        if response.status_code != 200:
            raise serializers.ValidationError("Invalid Google access token.")

        info = response.json()

        if not info.get("email_verified"):
            raise serializers.ValidationError("Google account email is not verified.")

        return {
            "email": info["email"].lower().strip(),
            "display_name": info.get("name", ""),
            "avatar_url": info.get("picture", None),
        }
