from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

from apps.clients.models import Client, Invite
from apps.common.logger import logger
from apps.request_management.models import Request

CLIENT_INSIGHT_TTL = settings.CLIENT_INSIGHT_TTL


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_client_invite_email(
    self,
    client_email: str,
    client_name: str,
    provider_name: str,
    tenant_slug: str,
    invite_token: str,
):

    frontend_base = settings.FRONTEND_URL
    base = frontend_base.replace("https://", "").replace("http://", "")
    accept_url = f"https://{tenant_slug}.{base}/accept-invite?token={invite_token}"

    subject = f"You've been invited to {provider_name}'s workspace on Groven"

    message = f"""Hi {client_name},

{provider_name} has invited you to their client workspace on Groven.

Click the link below to set your password and get started:

{accept_url}

This link expires in 48 hours.

If you weren't expecting this invite, you can ignore this email.

— The Groven Team
"""

    LOGO_URL = settings.LOGO_URL_BRANDING
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#F8FAF9;-webkit-font-smoothing:antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAF9;padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="540px" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #EAECEB;box-shadow:0 4px 12px rgba(0,0,0,0.02);overflow:hidden;">
              
              <!-- Brand Logo Container -->
              <tr>
                <td style="padding:40px 40px 24px 40px;">
                  <a href="https://groven.in" style="display:inline-block; text-decoration:none;">
                    <img src="{LOGO_URL}" alt="Groven" height="70" style="display:block;height:28px;width:auto;border:0;outline:none;text-decoration:none;">
                  </a>
                </td>
              </tr>

              <!-- Greeting & Header -->
              <tr>
                <td style="padding:0 40px 20px 40px;">
                  <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:600;color:#1A1F1C;line-height:28px;">
                    You've been invited
                  </h1>
                  <p style="margin:0;font-size:14px;color:#606A64;line-height:20px;">
                    Hi {client_name},<br/><br/>
                    <strong>{provider_name}</strong> has invited you to their workspace on Groven. Click the link below to set your password and get started.
                  </p>
                </td>
              </tr>

              <!-- Interactive Call to Action Button -->
              <tr>
                <td align="center" style="padding:10px 40px 30px 40px; text-align:left;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px;background-color:#0F6E56;">
                        <a href="{accept_url}" target="_blank" style="border:1px solid #0F6E56;border-radius:8px;color:#ffffff;display:inline-block;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">
                          Accept Invite & Set Password
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Context Contextual Callout -->
              <tr>
                <td style="padding:0 40px 32px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EBF5F1;border-radius:8px;padding:12px 16px;">
                    <tr>
                      <td style="font-size:13px;color:#0C5744;font-weight:500;text-align:left;line-height:1.6;">
                        ⏳ <strong>Note:</strong> This link expires in 48 hours. If you weren't expecting this invite, you can safely ignore this email.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Standard Clean Footer Footer -->
              <tr>
                <td style="padding:32px 40px;background-color:#F8FAF9;border-top:1px solid #EAECEB;text-align:center;">
                  <p style="margin:0 0 6px 0;font-size:12px;color:#7A857F;line-height:16px;">
                    © 2026 Groven. All rights reserved.
                  </p>
                  <p style="margin:0;font-size:11px;color:#A3AEA8;line-height:16px;">
                    Groven — Client Portal
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client_email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def expire_old_invites():
    """
    Every hour — mark pending invites past their expiry as expired.
    """

    now = timezone.now()
    updated = Invite.objects.filter(
        status="pending",
        expires_at__lt=now,
    ).update(status="expired")

    logger.info(f"[expire_old_invites] Marked {updated} invite(s) as expired.")
    return updated


@shared_task
def mark_inactive_clients():
    """
    Nightly — flag clients with no request activity in 90+ days.
    Uses last request updated_at as the activity signal.
    """

    cutoff = timezone.now() - timezone.timedelta(days=90)

    active_client_ids = (
        Request.objects.filter(
            is_deleted=False,
            updated_at_gte=cutoff,
        )
        .values_list("client_id", flat=True)
        .distinct()
    )

    updated = (
        Client.objects.filter(
            is_deleted=False,
            is_deactivated=False,
        )
        .exclude(
            id__in=active_client_ids,
        )
        .update(is_deactivated=True)
    )

    logger.info(f"[mark_inactive_clients] Deactivated {updated} inactive client(s).")
    return updated


@shared_task
def generate_client_insights():
    """Nightly scan — flags clients gone quiet or spiking in volume. Cache-only, no schema change."""
    cutoff_quiet = timezone.now() - timedelta(days=14)
    cutoff_recent = timezone.now() - timedelta(days=7)

    for client in Client.objects.filter(
        is_deleted=False, is_deactivated=False
    ).iterator():
        recent_count = Request.objects.filter(
            client=client, is_deleted=False, created_at__gte=cutoff_recent
        ).count()
        last_request = (
            Request.objects.filter(client=client, is_deleted=False)
            .order_by("-created_at")
            .first()
        )

        insight = None
        if last_request and last_request.created_at < cutoff_quiet:
            insight = "gone_quiet"
        elif recent_count >= 5:
            insight = "high_volume"

        cache.set(f"client_insight:{client.id}", insight, CLIENT_INSIGHT_TTL)
