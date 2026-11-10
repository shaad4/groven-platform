import uuid

import boto3
from botocore.exceptions import ClientError
from django.conf import settings

from apps.clients.models import Client
from apps.clients.repositories import ClientRepository
from apps.common.logger import logger
from apps.tenants.models import TenantMembership

from .repositories import TenantSettingsRepository, UserSettingsRepository


# custom Exceptions
class WrongCurrentPassword(Exception):
    pass


class SlugAlreadyTaken(Exception):
    pass


class InvalidFileType(Exception):
    pass


class FileTooLarge(Exception):
    pass


class S3UploadError(Exception):
    pass


# S3 Helper

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


def _validate_image(file):
    """Shared validation for logo and avatar uploads."""
    content_type = getattr(file, "content_type", "") or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise InvalidFileType(
            "Unsupported file type. Please upload a JPG, PNG, WebP, or SVG."
        )
    if file.size > MAX_FILE_SIZE_BYTES:
        raise FileTooLarge("File must be 2 MB or smaller.")


def _upload_to_s3(file, folder: str) -> str:
    """
    Upload a file-like object to S3.
    Returns the public URL.
    Folder: 'logos' | 'avatars'
    """
    ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else "jpg"
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    try:
        s3.upload_fileobj(
            file,
            settings.AWS_STORAGE_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": file.content_type},
        )
    except ClientError as e:
        logger.error("s3_upload_failed folder=%s error=%s", folder, str(e))
        raise S3UploadError("File upload failed. Please try again.")

    url = (
        f"https://{settings.AWS_STORAGE_BUCKET_NAME}"
        f".s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}"
    )
    logger.info("s3_upload_success folder=%s key=%s", folder, key)
    return url


# Profile Service


class ProfileService:

    @staticmethod
    def get_profile(user):
        return {
            "display_name": user.display_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
        }

    @staticmethod
    def update_display_name(user, display_name):
        user = UserSettingsRepository.update_display_name(user, display_name)
        logger.info("profile_display_name_updated user_id=%s", user.id)
        return user

    @staticmethod
    def change_password(user, current_password, new_password):
        if not user.check_password(current_password):
            raise WrongCurrentPassword("current password is incorrect")
        UserSettingsRepository.update_password(user, new_password)
        logger.info("profile_password_changed user_id=%s", user.id)

    @staticmethod
    def upload_avatar(user, file):
        _validate_image(file)
        url = _upload_to_s3(file, folder="avatars")
        UserSettingsRepository.update_avatar(user, url)
        logger.info("profile_avatar_uploaded user_id=%s", user.id)
        return url


# Workspace Services

DEFAULT_STATUS_LABELS = {
    "received": "Received",
    "in_review": "In Review",
    "in_progress": "In Progress",
    "delivered": "Delivered",
    "closed": "Closed",
}


class WorkspaceService:

    @staticmethod
    def get_workspace(tenant):
        usage = getattr(tenant, "usage", None)
        plan = tenant.plan

        effective_client_limit = (
            tenant.client_limit_override
            if tenant.client_limit_override is not None
            else plan.client_limit
        )

        return {
            "name": tenant.name,
            "tagline": tenant.tagline or "",
            "slug": tenant.slug,
            "logo_url": tenant.logo_url,
            "accent_color": tenant.accent_color or "#0F6E56",
            "white_label_enabled": tenant.white_label_enabled,
            "custom_status_labels": tenant.custom_status_labels
            or DEFAULT_STATUS_LABELS,
            "plan": {
                "name": plan.name,
                "client_limit": effective_client_limit,
                "request_limit": plan.request_limit,
            },
            "usage": {
                "client_count": usage.client_count if usage else 0,
                "active_request_count": usage.active_request_count if usage else 0,
            },
        }

    @staticmethod
    def update_workspace(tenant, validated_data: dict):
        if "slug" in validated_data and validated_data["slug"] != tenant.slug:
            if TenantSettingsRepository.slug_taken(
                validated_data["slug"], exclude_tenant_id=tenant.id
            ):
                raise SlugAlreadyTaken("This workspace URL is already taken.")

        tenant, slug_changed = TenantSettingsRepository.update_workspace(
            tenant, validated_data
        )
        logger.info(
            "workspace_updated tenant_id=%s slug_changed=%s",
            tenant.id,
            slug_changed,
        )
        return tenant, slug_changed

    @staticmethod
    def upload_logo(tenant, file):
        _validate_image(file)
        url = _upload_to_s3(file, folder="logos")
        TenantSettingsRepository.update_logo(tenant, url)
        logger.info("workspace_logo_uploaded tenant_id=%s", tenant.id)
        return url


# Notificiaction Service

PROVIDER_NOTIFICATION_DEFAULTS = {
    "in_app": {
        "new_request": True,
        "client_reply": True,
        "client_viewed_delivery": True,
        "client_accepted_invite": True,
        "request_overdue": True,
    },
    "email": {
        "new_request": True,
        "client_reply": True,
        "client_viewed_delivery": False,
        "client_accepted_invite": True,
        "weekly_summary": True,
        "weekly_summary_day": "Mon",
    },
}

CLIENT_NOTIFICATION_DEFAULTS = {
    "email": {
        "status_change": True,
        "new_message": True,
        "files_delivered": False,
    },
}


class NotificationService:

    @staticmethod
    def get_preferences(user, role):
        stored = UserSettingsRepository.get_notification_settings(user)

        if role == "provider":
            defaults = PROVIDER_NOTIFICATION_DEFAULTS
        else:
            defaults = CLIENT_NOTIFICATION_DEFAULTS

        merged = {}
        for section, prefs in defaults.items():
            stored_section = stored.get(section, {})
            merged[section] = {**prefs, **stored_section}

        return merged

    @staticmethod
    def update_preferences(user, role, data):

        if role == "provider":
            allowed_sections = {"in_app", "email"}
        else:
            allowed_sections = {"email"}

        clean = {k: v for k, v in data.items() if k in allowed_sections}
        UserSettingsRepository.update_notification_settings(user, clean)
        logger.info("notification_prefs_updated user_id=%s role=%s", user.id, role)
        return NotificationService.get_preferences(user, role)


# Delete Account


class DeleteAccountService:

    @staticmethod
    def leave_workspace(user, tenant, role):
        """
        Soft-delete: Based on Roles.
        User's global account and other memberships are untouched.
        """

        if role == TenantMembership.Role.PROVIDER:
            success = TenantSettingsRepository.deactivate_tenant_cascade(tenant)
            if success:
                logger.warning(
                    "tenant_deleted_by_provider user_id=%s tenant_id=%s",
                    user.id,
                    tenant.id,
                )
            return success

        success = UserSettingsRepository.deactivate_membership(user, tenant)
        if success:
            client = Client.objects.filter(
                user=user,
                tenant=tenant,
                is_deleted=False,
            ).first()
            if client and not client.is_deactivated:
                ClientRepository.deactiavte(client)

            logger.info(
                "membership_deactivated user_id=%s tenant_id=%s role=%s",
                user.id,
                tenant.id,
                role,
            )
        return success
