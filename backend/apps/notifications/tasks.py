from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.clients.models import Client
from apps.common.logger import logger
from apps.notifications.models import Notification
from apps.notifications.models import Notification as NotifModel
from apps.notifications.utils import create_notification
from apps.request_management.models import Request
from apps.settings.repositories import UserSettingsRepository
from apps.tenants.models import TenantMembership

from .services.email_service import send_email
from .services.email_templates import (build_notification_email,
                                       build_password_reset_email,
                                       build_verification_email,
                                       build_weekly_summary_email)

# Email Prefrence Helper
_EMAIL_PREF_KEY = {
    "new_request": "new_request",
    "new_message": ("client_reply", "new_message"),
    "status_change": "status_change",
    "files_delivered": "files_delivered",
    "invite_accepted": "client_accepted_invite",
    "client_viewed_delivery": None,
    "request_overdue": "request_overdue",
}


def _wants_email(user, event_type: str) -> bool:
    mapping = _EMAIL_PREF_KEY.get(event_type)
    if mapping is None:
        return False
    email_prefs = UserSettingsRepository.get_notification_settings(user).get(
        "email", {}
    )
    if isinstance(mapping, tuple):
        return any(email_prefs.get(k, True) for k in mapping)
    return email_prefs.get(mapping, True)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, user_email, display_name, token):
    """
    Sends Groven verification email with HTML UI.
    Retries automatically on failure.
    """

    verify_url = f"{settings.FRONTEND_URL}" f"/verify-email?token={token}"

    email_data = build_verification_email(
        display_name=display_name, verify_url=verify_url
    )

    try:
        send_email(
            subject=email_data["subject"],
            text_content=email_data["text_content"],
            html_content=email_data["html_content"],
            recipients=[user_email],
        )

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry=60)
def send_password_reset_email(self, user_email, display_name, token, tenant_slug=None):
    """
    Sends Groven password reset email with HTML UI.
    Retries automatically on failure.
    """

    base_frontend = settings.FRONTEND_URL.replace("http://", "").replace("https://", "")

    if tenant_slug:
        reset_url = (
            f"https://{tenant_slug}.{base_frontend}" f"/reset-password?token={token}"
        )
    else:
        reset_url = f"{settings.FRONTEND_URL}" f"/reset-password?token={token}"

    email_data = build_password_reset_email(
        display_name=display_name,
        reset_url=reset_url,
    )

    try:
        send_email(
            subject=email_data["subject"],
            text_content=email_data["text_content"],
            html_content=email_data["html_content"],
            recipients=[user_email],
        )

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def email_fallback_for_offline_users():
    """
    Every 15 min — emails unread, un-emailed notifications older than
    EMAIL_FALLBACK_DELAY_MINUTES. Respects per-user email preferences.
    Opted-out notifications are still stamped with emailed_at to prevent
    re-evaluation on every subsequent run.
    """
    cutoff = timezone.now() - timezone.timedelta(
        minutes=settings.EMAIL_FALLBACK_DELAY_MINUTES
    )

    pending = Notification.objects.filter(
        is_read=False,
        emailed_at__isnull=True,
        created_at__lte=cutoff,
    ).select_related("recipient", "tenant", "related_request")

    sent = opted_out = 0
    now = timezone.now()

    for notif in pending:
        try:
            if not _wants_email(notif.recipient, notif.event_type):
                opted_out += 1
                notif.emailed_at = now  # stamp so we don't re-check next run
                notif.save(update_fields=["emailed_at"])
                continue

            email_data = build_notification_email(notif)
            send_email(
                subject=email_data["subject"],
                text_content=email_data["text_content"],
                html_content=email_data["html_content"],
                recipients=[notif.recipient.email],
            )
            notif.emailed_at = now
            notif.save(update_fields=["emailed_at"])
            sent += 1

        except Exception as e:
            logger.error(f"[email_fallback] Failed for notification {notif.id}: {e}")

    logger.info(f"[email_fallback_for_offline_users] sent={sent} opted_out={opted_out}")
    return sent


@shared_task
def send_weekly_provider_summary():
    """
    Runs daily at 8am IST (beat schedule changed from Monday-only).
    Each provider is emailed only on their preferred day.
    Respects the weekly_summary toggle and weekly_summary_day preference.
    """
    today_abbr = timezone.now().strftime("%a")
    one_week_ago = timezone.now() - timezone.timedelta(days=7)

    provider_memberships = TenantMembership.objects.filter(
        role="provider",
        is_active=True,
    ).select_related("user", "tenant")

    sent = opted_out = 0

    for membership in provider_memberships:
        tenant = membership.tenant
        user = membership.user

        email_prefs = UserSettingsRepository.get_notification_settings(user).get(
            "email", {}
        )

        # Respect the weekly_summary toggle
        if not email_prefs.get("weekly_summary", True):
            opted_out += 1
            continue

        # Only send on the user's preferred day
        preferred_day = email_prefs.get("weekly_summary_day", "Mon")
        if today_abbr != preferred_day:
            continue

        requests_received = Request.objects.filter(
            tenant=tenant,
            created_at__gte=one_week_ago,
            is_deleted=False,
        ).count()

        requests_delivered = Request.objects.filter(
            tenant=tenant,
            status__in=[Request.Status.DELIVERED, Request.Status.CLOSED],
            updated_at__gte=one_week_ago,
            is_deleted=False,
        ).count()

        pending_requests = Request.objects.filter(
            tenant=tenant,
            status__in=[
                Request.Status.RECEIVED,
                Request.Status.IN_REVIEW,
                Request.Status.IN_PROGRESS,
            ],
            is_deleted=False,
        ).count()

        active_clients = Client.objects.filter(
            tenant=tenant,
            status=Client.Status.ACTIVE,
            is_deleted=False,
            is_deactivated=False,
        ).count()

        completion_rate = (
            round((requests_delivered / requests_received) * 100)
            if requests_received
            else 0
        )

        if requests_received == 0 and requests_delivered == 0:
            continue

        try:
            email_data = build_weekly_summary_email(
                display_name=user.display_name,
                tenant_name=tenant.name,
                requests_received=requests_received,
                requests_delivered=requests_delivered,
                pending_requests=pending_requests,
                active_clients=active_clients,
                completion_rate=completion_rate,
            )
            send_email(
                subject=email_data["subject"],
                text_content=email_data["text_content"],
                html_content=email_data["html_content"],
                recipients=[user.email],
            )
            sent += 1
        except Exception as e:
            logger.error(
                f"[weekly_summary] Failed for {user.email} / {tenant.slug}: {e}"
            )

    logger.info(f"[send_weekly_provider_summary] sent={sent} opted_out={opted_out}")
    return sent


@shared_task
def notify_overdue_requests():
    """
    Runs every hour. Finds requests past due_date that are still active
    and haven't been notified yet. Creates in-app + email per preferences.
    """

    today = timezone.now().date()
    now = timezone.now()

    overdue = Request.objects.filter(
        due_date__lt=today,
        due_date__isnull=False,
        status__in=[
            Request.Status.RECEIVED,
            Request.Status.IN_REVIEW,
            Request.Status.IN_PROGRESS,
        ],
        is_deleted=False,
        overdue_notified_at__isnull=True,
    ).select_related("tenant", "provider", "client")

    notified = 0

    for req in overdue:
        provider = req.provider
        due_str = req.due_date.strftime("%b %d")

        try:
            # In-app
            create_notification(
                tenant=req.tenant,
                recipient=provider,
                event_type=Notification.EventType.REQUEST_OVERDUE,
                title="Request overdue",
                body=f'"{req.title}" was due {due_str} and hasn\'t been delivered.',
                related_request=req,
                related_client=req.client,
            )

            # Email
            if _wants_email(provider, "request_overdue"):
                temp = NotifModel(
                    tenant=req.tenant,
                    recipient=provider,
                    event_type="request_overdue",
                    title="Request overdue",
                    body=f'"{req.title}" was due {due_str} and hasn\'t been delivered.',
                    related_request=req,
                )
                email_data = build_notification_email(temp)
                send_email(
                    subject=email_data["subject"],
                    text_content=email_data["text_content"],
                    html_content=email_data["html_content"],
                    recipients=[provider.email],
                )

            req.overdue_notified_at = now
            req.save(update_fields=["overdue_notified_at", "updated_at"])
            notified += 1

        except Exception as e:
            logger.error(f"[notify_overdue_requests] Failed for request {req.id}: {e}")

    logger.info(f"[notify_overdue_requests] processed={notified}")
    return notified
