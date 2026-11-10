from django.conf import settings

LOGO_URL = settings.LOGO_URL_BRANDING


def build_verification_email(display_name, verify_url):
    subject = "Verify your Groven account"

    # fallback plain text email
    text_content = f"""
    Hi {display_name},

    Welcome to Groven 🌿

    Verify your email address:

    {verify_url}

    This verification link expires in 24 hours.

    — The Groven Team
    """

    # beautiful HTML email
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your Groven account</title>
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
                    Verify your email
                  </h1>
                  <p style="margin:0;font-size:14px;color:#606A64;line-height:20px;">
                    Hi {display_name},<br/><br/>
                    Welcome to Groven. You're one step away from launching your workspace.
                  </p>
                </td>
              </tr>

              <!-- Interactive Call to Action Button -->
              <tr>
                <td align="center" style="padding:10px 40px 30px 40px; text-align:left;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px;background-color:#0F6E56;">
                        <a href="{verify_url}" target="_blank" style="border:1px solid #0F6E56;border-radius:8px;color:#ffffff;display:inline-block;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">
                          Verify Email Address
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
                        🚀 <strong>After verification you'll be able to:</strong><br/>
                        • Create your branded workspace<br/>
                        • Manage clients and projects<br/>
                        • Automate workflows
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
                    This link expires in 24 hours. If you didn't sign up for Groven, please ignore this email.
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

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }


def build_password_reset_email(display_name, reset_url):
    subject = "Reset your Groven password"

    text_content = f"""
    Hi {display_name},

    You requested a password reset for your Groven account.

    Reset your password here:
    {reset_url}

    This link expires in 30 minutes.

    If you didn't request this, ignore this email — your password won't change.

    — The Groven Team
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your Groven password</title>
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
                    Reset your password
                  </h1>
                  <p style="margin:0;font-size:14px;color:#606A64;line-height:20px;">
                    Hi {display_name},<br/><br/>
                    We received a request to reset your Groven password. Click the button below to choose a new one.
                  </p>
                </td>
              </tr>

              <!-- Interactive Call to Action Button -->
              <tr>
                <td align="center" style="padding:10px 40px 30px 40px; text-align:left;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px;background-color:#0F6E56;">
                        <a href="{reset_url}" target="_blank" style="border:1px solid #0F6E56;border-radius:8px;color:#ffffff;display:inline-block;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Context Contextual Callout -->
              <tr>
                <td style="padding:0 40px 32px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF3EB;border-radius:8px;padding:12px 16px;">
                    <tr>
                      <td style="font-size:13px;color:#854308;font-weight:500;text-align:left;line-height:1.6;">
                        ⚠️ This link will expire in 30 minutes for security reasons. If you did not request a password reset, no action is needed.
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
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }


def build_notification_email(notif):
    subject = notif.title

    text_content = (
        f"Hi {notif.recipient.display_name},\n\n"
        f"{notif.body}\n\n"
        f"Log in to Groven to view more details.\n\n"
        f"— Groven"
    )

    html_content = f"""
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
  </head>

  <body style="
    margin:0;
    padding:0;
    background:#F8FAF9;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  ">

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#F8FAF9;padding:40px 16px;"
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:540px;
              background:#ffffff;
              border-radius:16px;
              border:1px solid #EAECEB;
              overflow:hidden;
            "
          >

            <!-- Logo -->
            <tr>
              <td style="padding:32px 40px 24px 40px;">
                <a href="https://groven.in" style="display:inline-block; text-decoration:none;">
                  <img
                    src="{LOGO_URL}"
                    alt="Groven"
                    width="180"
                    style="
                      display:block;
                      width:180px;
                      height:auto;
                      border:0;
                    "
                  >
                </a>
              </td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="padding:0 40px 20px 40px;">
                <h1 style="
                  margin:0;
                  font-size:22px;
                  font-weight:700;
                  color:#1A1F1C;
                  line-height:30px;
                ">
                  {notif.title}
                </h1>
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <p style="
                  margin:0;
                  font-size:15px;
                  line-height:1.8;
                  color:#5E6862;
                ">
                  Hi {notif.recipient.display_name},
                </p>

                <p style="
                  margin:20px 0 0;
                  font-size:15px;
                  line-height:1.8;
                  color:#5E6862;
                ">
                  {notif.body}
                </p>
              </td>
            </tr>

            <!-- Callout -->
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <table
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    background:#EBF5F1;
                    border-radius:10px;
                  "
                >
                  <tr>
                    <td style="
                      padding:16px 18px;
                      font-size:13px;
                      color:#0C5744;
                      line-height:1.6;
                    ">
                      🔔 This notification was delivered by Groven to keep your workspace activity up to date.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:0 40px 40px 40px;">

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td
                      align="center"
                      style="
                        background:#0F6E56;
                        border-radius:8px;
                      "
                    >
                      <a
                        href="https://groven.in/login"
                        style="
                          display:inline-block;
                          padding:14px 28px;
                          color:#ffffff;
                          text-decoration:none;
                          font-size:14px;
                          font-weight:600;
                        "
                      >
                        Open Groven
                      </a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="
                padding:28px 40px;
                background:#F8FAF9;
                border-top:1px solid #EAECEB;
                text-align:center;
              ">

                <p style="
                  margin:0;
                  font-size:12px;
                  color:#7A857F;
                  line-height:18px;
                ">
                  You're receiving this email because you were offline when this update occurred.
                </p>

                <p style="
                  margin:10px 0 0;
                  font-size:11px;
                  color:#A3AEA8;
                ">
                  © 2026 Groven. All rights reserved.
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

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }


def build_weekly_summary_email(
    display_name,
    tenant_name,
    requests_received,
    requests_delivered,
    pending_requests,
    active_clients,
    completion_rate,
):
    subject = f"Your Groven week — {tenant_name}"

    # Clean, comprehensive plain-text fallback
    text_content = (
        f"Hi {display_name},\n\n"
        f"Here's your weekly summary for {tenant_name}:\n\n"
        f"  • Requests received: {requests_received}\n"
        f"  • Requests delivered: {requests_delivered}\n"
        f"  • Completion rate: {completion_rate}%\n"
        f"  • Pending requests: {pending_requests}\n"
        f"  • Active clients: {active_clients}\n\n"
        f"Log in to your workspace dashboard to see the full picture.\n\n— Groven"
    )

    # Bulletproof, modern SaaS layout styled with standard cross-client HTML practices
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
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
                <td style="padding:0 40px 28px 40px;">
                  <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:600;color:#1A1F1C;line-height:28px;">
                    Your week at a glance
                  </h1>
                  <p style="margin:0;font-size:14px;color:#606A64;line-height:20px;">
                    Here is how <strong>{tenant_name}</strong> performed over the last 7 days, {display_name}.
                  </p>
                </td>
              </tr>

              <!-- Primary Metrics Card Grid -->
              <tr>
                <td style="padding:0 40px 16px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td width="48%" style="background-color:#F4F6F5;border-radius:10px;padding:20px;text-align:left;vertical-align:top;">
                        <span style="display:block;font-size:11px;font-weight:600;color:#606A64;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Received</span>
                        <span style="display:block;font-size:32px;font-weight:700;color:#0F6E56;line-height:36px;">{requests_received}</span>
                      </td>
                      <td width="4%">&nbsp;</td>
                      <td width="48%" style="background-color:#F4F6F5;border-radius:10px;padding:20px;text-align:left;vertical-align:top;">
                        <span style="display:block;font-size:11px;font-weight:600;color:#606A64;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Delivered</span>
                        <span style="display:block;font-size:32px;font-weight:700;color:#0F6E56;line-height:36px;">{requests_delivered}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Secondary Performance Indicators -->
              <tr>
                <td style="padding:0 40px 24px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td width="48%" style="background-color:#ffffff;border:1px solid #EAECEB;border-radius:10px;padding:16px;text-align:left;vertical-align:top;">
                        <span style="display:block;font-size:11px;font-weight:600;color:#7A857F;text-transform:uppercase;margin-bottom:2px;">Completion Rate</span>
                        <span style="display:block;font-size:18px;font-weight:600;color:#1A1F1C;">{completion_rate}%</span>
                      </td>
                      <td width="4%">&nbsp;</td>
                      <td width="48%" style="background-color:#ffffff;border:1px solid #EAECEB;border-radius:10px;padding:16px;text-align:left;vertical-align:top;">
                        <span style="display:block;font-size:11px;font-weight:600;color:#7A857F;text-transform:uppercase;margin-bottom:2px;">Pending Requests</span>
                        <span style="display:block;font-size:18px;font-weight:600;color:#1A1F1C;">{pending_requests}</span>
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
                      <td style="font-size:13px;color:#0C5744;font-weight:500;text-align:center;">
                        💼 Currently maintaining <strong>{active_clients}</strong> active client ecosystem(s).
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Interactive Call to Action Button -->
              <tr>
                <td align="center" style="padding:0 40px 40px 40px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px;background-color:#0F6E56;">
                        <a href="https://groven.in/login" target="_blank" style="border:1px solid #0F6E56;border-radius:8px;color:#ffffff;display:inline-block;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">
                          Open Dashboard
                        </a>
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
                    You are receiving this digest summary as an active workspace administrator.
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

    return {
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
    }
