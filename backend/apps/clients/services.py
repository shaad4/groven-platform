from django.core.cache import cache
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.common.logger import logger
from apps.notifications.models import Notification
from apps.notifications.utils import create_notification
from apps.request_management.models import Request
from apps.tenants.models import TenantMembership, TenantUsage
from apps.users.repositories import UserRepository

from .models import Client, Invite
from .repositories import ClientRepository, InviteRepository, TagRepository


# custom exceptions
class ClientLimitExceeded(Exception):
    pass


class DuplicateClientEmail(Exception):
    pass


class PendingInviteExists(Exception):
    pass


class InvalidInviteToken(Exception):
    pass


class ExpiredInviteToken(Exception):
    pass


class ClientNotFound(Exception):
    pass


class ClientAlreadyDeactivated(Exception):
    pass


class ClientNotDeactivated(Exception):
    pass


class CannotResendToActiveClient(Exception):
    pass


class ClientService:

    @staticmethod
    @transaction.atomic
    def invite_client(
        tenant,
        provider,
        client_name,
        client_email,
        business_type=None,
        private_note=None,
        tags=None,
    ):

        usage = TenantUsage.objects.select_for_update().get(tenant=tenant)
        limit = tenant.effective_client_limit

        if limit != -1:
            pending_invite_count = Invite.objects.filter(
                tenant=tenant,
                status=Invite.Status.PENDING,
                expires_at__gt=timezone.now(),
            ).count()

            if usage.client_count + pending_invite_count >= limit:
                raise ClientLimitExceeded(
                    f"You have reached your plan limit of {limit} clients "
                    f"(including pending invites). Upgrade to Pro to add more."
                )

        email = client_email.lower().strip()

        if ClientRepository.email_exists_in_tenant(email, tenant.id):
            raise DuplicateClientEmail(
                "A client with this email already exists in your workspace."
            )

        if InviteRepository.has_pending_invite(email, tenant.id):
            raise DuplicateClientEmail(
                "An invite has already been sent to this email and is still pending."
            )

        invite = InviteRepository.create(
            tenant=tenant,
            provider=provider,
            client_email=email,
            client_name=client_name,
        )

        client = ClientRepository.create_pending(
            tenant=tenant,
            provider=provider,
            client_name=client_name,
            business_type=business_type,
            private_note=private_note,
            client_email=email,
        )

        if tags:
            TagRepository.set_client_tags(client, tags, tenant)

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        return {"invite": invite, "client": client}

    @staticmethod
    @transaction.atomic
    def accept_invite(token, password):

        invite = InviteRepository.get_pending_by_token(token)

        if invite is None:
            raise InvalidInviteToken(
                "This invite link is invalid or has already been used."
            )

        if invite.expires_at < timezone.now():
            raise ExpiredInviteToken(
                "This invite link has expired. Ask your provider to resend it."
            )

        tenant = invite.tenant
        provider = invite.provider
        email = invite.client_email

        # find or create the global user
        existing_user = UserRepository.get_by_email(email)

        if existing_user:
            # user already exists globally (client of another agency)
            user = existing_user

            # Check they dont already have a membership here
            already_member = TenantMembership.objects.filter(
                user=user, tenant=tenant, is_active=True
            ).exists()

            if already_member:
                InviteRepository.mark_accepted(invite)
                client = Client.objects.get(user=user, tenant=tenant, is_deleted=False)
                return {"user": user, "tenant": tenant, "client": client}
        else:
            # brand new user, set password from invite form
            if not password:
                raise InvalidInviteToken("Password is required for new accounts.")

            user = UserRepository.create_client_user(
                email=email,
                password=password,
                display_name=invite.client_name,
            )

        # Create membership (role=client in this tenant)
        membership, _ = TenantMembership.objects.update_or_create(
            user=user,
            tenant=tenant,
            defaults={
                "role": TenantMembership.Role.CLIENT,
                "is_active": True,
            },
        )

        client = ClientRepository.get_pending_by_invite(invite)

        old_client_ids_to_clear = Client.objects.filter(
            membership=membership, is_deleted=True
        )
        if client:
            old_client_ids_to_clear = old_client_ids_to_clear.exclude(id=client.id)
        old_client_ids_to_clear.update(membership=None)

        if client:
            ClientRepository.activate(client, user, membership)
        else:
            # Fallback — shouldn't happen but safe to handle
            client = Client.objects.create(
                tenant=tenant,
                user=user,
                membership=membership,
                provider=provider,
                status=Client.Status.ACTIVE,
                joined_at=timezone.now(),
            )
        # Update usage counter
        TenantUsage.objects.filter(tenant=tenant).update(
            client_count=F("client_count") + 1
        )

        # Mark invite as accepted
        InviteRepository.mark_accepted(invite)

        def _notify_invite_accepted():
            try:
                create_notification(
                    tenant=tenant,
                    recipient=provider,
                    event_type=Notification.EventType.INVITE_ACCEPTED,
                    title=f"{invite.client_name or 'A client'} joined your portal",
                    body=f"{invite.client_name or 'A new client'} accepted their invite and is now active.",
                    related_client=client,
                )
            except Exception as e:
                logger.error(f"[accept_invite] Notification failed: {e}")

        transaction.on_commit(_notify_invite_accepted)

        return {
            "user": user,
            "tenant": tenant,
            "client": client,
            "membership": membership,
        }

    @staticmethod
    @transaction.atomic
    def update_client(client_id, tenant, tags=None, **fields):
        client = ClientRepository.get_by_id(client_id, tenant.id)
        if not client:
            raise ClientNotFound("Client not found.")
        ClientRepository.update(client, **fields)
        if tags is not None:
            TagRepository.set_client_tags(client, tags, tenant)
        return client

    @staticmethod
    @transaction.atomic
    def deactivate_client(client_id, tenant):
        client = ClientRepository.get_by_id(client_id, tenant.id)
        if not client:
            raise ClientNotFound("Client not found.")
        if client.is_deactivated:
            raise ClientAlreadyDeactivated("Client is already deactivated.")
        if client.membership:
            client.membership.is_active = False
            client.membership.save(update_fields=["is_active"])
        ClientRepository.deactiavte(client)
        return client

    @staticmethod
    @transaction.atomic
    def reactivate_client(client_id, tenant):
        client = ClientRepository.get_by_id(client_id, tenant.id)
        if not client:
            raise ClientNotFound("Client not found.")
        if not client.is_deactivated:
            raise ClientNotDeactivated("Client is not deactivated.")
        if client.membership:
            client.membership.is_active = True
            client.membership.save(update_fields=["is_active"])
        ClientRepository.reactivate(client)
        return client

    @staticmethod
    @transaction.atomic
    def delete_client(client_id, tenant):

        client = ClientRepository.get_by_id(client_id, tenant.id)
        if not client:
            raise ClientNotFound("Client not found.")
        if client.membership:
            client.membership.is_active = False
            client.membership.save(update_fields=["is_active"])

        active_request_count_for_client = Request.objects.filter(
            client=client,
            is_deleted=False,
            status__in=[
                Request.Status.RECEIVED,
                Request.Status.IN_REVIEW,
                Request.Status.IN_PROGRESS,
            ],
        ).count()

        ClientRepository.soft_delete(client)

        TenantUsage.objects.filter(tenant=tenant, client_count__gt=0).update(
            client_count=F("client_count") - 1
        )

        if active_request_count_for_client > 0:
            TenantUsage.objects.filter(
                tenant=tenant, active_request_count__gte=active_request_count_for_client
            ).update(
                active_request_count=F("active_request_count")
                - active_request_count_for_client
            )

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        return client

    @staticmethod
    @transaction.atomic
    def resend_invite(client_id, tenant, provider):
        client = ClientRepository.get_by_id(client_id, tenant.id)
        if not client:
            raise ClientNotFound("Client not found.")
        if client.status != Client.Status.PENDING:
            raise CannotResendToActiveClient(
                "Invite can only be resent to pending clients."
            )
        old_invite = Invite.objects.filter(
            tenant=tenant,
            client_email=client.client_email,
            status=Invite.Status.PENDING,
        ).first()
        if old_invite:
            InviteRepository.cancel(old_invite)
        new_invite = InviteRepository.create(
            tenant=tenant,
            provider=provider,
            client_email=client.client_email,
            client_name=client.client_name,
        )
        return {"client": client, "invite": new_invite}
