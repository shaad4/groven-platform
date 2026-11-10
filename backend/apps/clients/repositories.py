from django.utils import timezone

from apps.tenants.models import Tenant

from .models import Client, ClientTagMap, Invite, Tag


class TagRepository:

    @staticmethod
    def get_or_create(tenant, name, color=None):
        tag, _ = Tag.objects.get_or_create(
            tenant=tenant,
            name=name.strip(),
            defaults={"color": color},
        )
        return tag

    @staticmethod
    def get_all_for_tenant(tenant_id):
        return Tag.objects.filter(tenant_id=tenant_id).order_by("name")

    @staticmethod
    def set_client_tags(client, tag_name, tenant):
        """Replace all tags on a client with the given list of tag names."""
        ClientTagMap.objects.filter(client=client).delete()
        for name in tag_name:
            tag = TagRepository.get_or_create(tenant=tenant, name=name.strip())
            ClientTagMap.objects.get_or_create(client=client, tag=tag)


class ClientRepository:

    @staticmethod
    def get_all_for_tenant(tenant_id):
        """Active, non-deleted clients for a tenant. Includes related user data."""
        return (
            Client.objects.filter(tenant_id=tenant_id, is_deleted=False)
            .prefetch_related("tag_maps__tag")
            .select_related("user", "membership")
            .order_by("-created_at")
        )

    @staticmethod
    def get_by_id(client_id, tenant_id):
        return (
            Client.objects.filter(id=client_id, tenant_id=tenant_id, is_deleted=False)
            .prefetch_related("tag_maps__tag")
            .select_related("user", "membership")
            .first()
        )

    @staticmethod
    def email_exists_in_tenant(email: str, tenant_id):
        """
        Check if a user with this email already has a client profile in this tenant.
        Used to prevent duplicate invites.
        """
        return Client.objects.filter(
            tenant_id=tenant_id,
            user__email=email.lower().strip(),
            is_deleted=False,
            status=Client.Status.ACTIVE,
        ).exists()

    @staticmethod
    def create_pending(
        tenant,
        provider,
        client_name,
        business_type=None,
        private_note=None,
        client_email="",
    ):
        """Create a pending Client record before invite is accepted."""
        return Client.objects.create(
            tenant=tenant,
            provider=provider,
            user=None,
            membership=None,
            status=Client.Status.PENDING,
            business_type=business_type,
            private_note=private_note,
            client_name=client_name,
            client_email=client_email,
        )

    @staticmethod
    def activate(client, user, membership):
        """Called on invite acceptance — fills in user, membership, flips status"""
        client.user = user
        client.membership = membership
        client.status = Client.Status.ACTIVE
        client.joined_at = timezone.now()
        client.save(
            update_fields=["user", "membership", "status", "joined_at", "updated_at"]
        )
        return client

    @staticmethod
    def get_pending_by_invite(invite):
        """Find the pending Client row that was created when this invite was sent."""
        return Client.objects.filter(
            tenant=invite.tenant,
            provider=invite.provider,
            status=Client.Status.PENDING,
            user__isnull=True,
            client_email=invite.client_email,
        ).first()

    @staticmethod
    def update(client, business_type=None, private_note=None):
        if business_type is not None:
            client.business_type = business_type or None
        if private_note is not None:
            client.private_note = private_note or None
        client.save(update_fields=["business_type", "private_note", "updated_at"])
        return client

    @staticmethod
    def deactiavte(client):
        client.is_deactivated = True
        client.save(update_fields=["is_deactivated", "updated_at"])
        return client

    @staticmethod
    def reactivate(client):
        client.is_deactivated = False
        client.save(update_fields=["is_deactivated", "updated_at"])
        return client

    @staticmethod
    def soft_delete(client):
        client.is_deleted = True
        client.deleted_at = timezone.now()
        client.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return client


class InviteRepository:

    @staticmethod
    def get_pending_by_token(token_value):
        return (
            Invite.objects.filter(token=token_value, status=Invite.Status.PENDING)
            .select_related("tenant", "provider")
            .first()
        )

    @staticmethod
    def has_pending_invite(email: str, tenant_id):
        return Invite.objects.filter(
            client_email=email.lower().strip(),
            tenant_id=tenant_id,
            status=Invite.Status.PENDING,
        ).exists()

    @staticmethod
    def get_pending_for_client_email(email, tenant_id):
        return Invite.objects.filter(
            client_email=email.lower().strip(),
            tenant_id=tenant_id,
            status=Invite.Status.PENDING,
        ).first()

    @staticmethod
    def create(tenant, provider, client_email, client_name):
        return Invite.objects.create(
            tenant=tenant,
            provider=provider,
            client_email=client_email.lower().strip(),
            client_name=client_name,
            expires_at=timezone.now() + timezone.timedelta(hours=48),
        )

    @staticmethod
    def mark_accepted(invite):
        invite.status = Invite.Status.ACCEPTED
        invite.accepted_at = timezone.now()
        invite.save(update_fields=["status", "accepted_at"])

    @staticmethod
    def cancel(invite):
        invite.status = Invite.Status.CANCELLED
        invite.save(update_fields=["status"])
