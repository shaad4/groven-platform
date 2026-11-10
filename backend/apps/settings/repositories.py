import uuid

from django.db import transaction

from apps.tenants.models import Tenant, TenantMembership
from apps.users.models import User


class UserSettingsRepository:
    """All user-related settings DB quires"""

    @staticmethod
    def get_by_id(user_id):
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return None

    @staticmethod
    def update_display_name(user, display_name):
        user.display_name = display_name
        user.save(update_fields=["display_name", "updated_at"])

        return user

    @staticmethod
    def update_avatar(user, avatar_url):
        user.avatar_url = avatar_url
        user.save(update_fields=["avatar_url", "updated_at"])
        return user

    @staticmethod
    def update_password(user, new_password):
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        return user

    @staticmethod
    @transaction.atomic
    def update_notification_settings(user, settings_patch):
        """
        Deep-merges settings_patch into users.settings.notifications.
        Uses select_for_update to prevent race conditions when multiple
        toggles are saved in quick succession (each is a separate request).
        """
        locked_user = User.objects.select_for_update().get(id=user.id)

        current = locked_user.settings or {}
        notifications = current.get("notifications", {})

        for section, prefs in settings_patch.items():
            if section not in notifications:
                notifications[section] = {}
            notifications[section].update(prefs)

        current["notifications"] = notifications
        locked_user.settings = current
        locked_user.save(update_fields=["settings", "updated_at"])

        user.settings = locked_user.settings
        return locked_user

    @staticmethod
    def get_notification_settings(user):
        settings = user.settings or {}
        return settings.get("notifications", {})

    @staticmethod
    def deactivate_membership(user, tenant):
        """Soft-delete: mark membership inactive for this tenant only."""
        updated = TenantMembership.objects.filter(
            user=user,
            tenant=tenant,
            is_active=True,
        ).update(is_active=False)
        return updated > 0


class TenantSettingsRepository:
    """All tenant-related settings DB queries"""

    @staticmethod
    def get_by_id(tenant_id):
        try:
            return Tenant.objects.select_related("plan", "usage").get(
                id=tenant_id, is_active=True
            )
        except Tenant.DoesNotExist:
            return None

    @staticmethod
    def slug_taken(slug, exclude_tenant_id=None):
        qs = Tenant.objects.filter(slug=slug, is_active=True)
        if exclude_tenant_id:
            qs = qs.exclude(id=exclude_tenant_id)
        return qs.exists()

    @staticmethod
    def update_workspace(tenant, fields):
        """
        Partial update — only saves fields that are in the dict.
        Returns (tenant, slug_changed: bool).
        """

        slug_changed = False
        allowed = [
            "name",
            "tagline",
            "slug",
            "accent_color",
            "white_label_enabled",
            "custom_status_labels",
        ]
        update_fields = ["updated_at"]

        for field in allowed:
            if field in fields:
                if field == "slug" and fields["slug"] != tenant.slug:
                    slug_changed = True
                setattr(tenant, field, fields[field])
                update_fields.append(field)

        tenant.save(update_fields=update_fields)
        return tenant, slug_changed

    @staticmethod
    def update_logo(tenant, logo_url):
        tenant.logo_url = logo_url
        tenant.save(update_fields=["logo_url", "updated_at"])
        return tenant

    @staticmethod
    @transaction.atomic
    def deactivate_tenant_cascade(tenant):
        """
        Soft-deletes a tenant (provider has left/deleted their workspace) and
        deactivates every TenantMembership tied to it — the provider's own
        membership AND every client's membership under this tenant.

        Tenant row and all related data (Client, Request, File, etc.) are
        NOT hard-deleted — is_active=False keeps everything in place for
        audit/recovery. S3 object cleanup is handled separately (not here).

        Returns True if the tenant was active and is now deactivated,
        False if it was already inactive.
        """
        locked_tenant = Tenant.objects.select_for_update().get(id=tenant.id)

        if not locked_tenant.is_active:
            return False

        locked_tenant.is_active = False
        locked_tenant.slug = f"{locked_tenant.slug}-deleted-{uuid.uuid4().hex[:8]}"
        locked_tenant.save(update_fields=["is_active", "slug", "updated_at"])

        TenantMembership.objects.filter(
            tenant=locked_tenant,
            is_active=True,
        ).update(is_active=False)

        return True
