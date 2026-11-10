from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_email(
    *,
    subject,
    text_content,
    html_content,
    recipients,
):
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )

    email.attach_alternative(html_content, "text/html")
    email.send()
