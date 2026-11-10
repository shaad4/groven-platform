from django.utils import timezone

from .models import EmailVerificationToken, PasswordResetToken, User


class UserRepository:
    """Queries against the global users table"""

    @staticmethod
    def get_by_email(email):
        """Look up a user by their globally unique email."""
        return User.objects.filter(email=email.lower().strip()).first()

    @staticmethod
    def get_by_id(user_id):
        return User.objects.filter(id=user_id).first()

    @staticmethod
    def email_exists(email):
        return User.objects.filter(email=email.lower().strip()).exists()

    @staticmethod
    def create_user(email, password, display_name, is_active):
        """Create a new global user (provider signup path)."""
        return User.objects.create_user(
            email=email,
            password=password,
            display_name=display_name,
            is_active=is_active,
        )

    @staticmethod
    def create_client_user(email, password, display_name):
        """
        Create a new global user for a client accepting their first invite.
        Client users start active (they come via invite, not email verification).
        """

        return User.objects.create_user(
            email=email,
            password=password,
            display_name=display_name,
            is_active=True,
            is_email_verified=True,  # invite link is the verification
        )

    @staticmethod
    def activate(user):
        user.is_active = True
        user.is_email_verified = True
        user.save(update_fields=["is_active", "is_email_verified", "updated_at"])

    @staticmethod
    def set_password(user, new_password):
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])


class EmailVerificationTokenRepository:

    @staticmethod
    def create(user, expires_at):
        return EmailVerificationToken.objects.create(
            user=user,
            expires_at=expires_at,
        )

    @staticmethod
    def get_pending(token_value):
        return (
            EmailVerificationToken.objects.filter(
                token=token_value,
                status=EmailVerificationToken.Status.PENDING,
            )
            .select_related("user")
            .first()
        )

    @staticmethod
    def expire_others(user, keep_id):
        """Expire all other pending tokens for this user after one is used"""

        EmailVerificationToken.objects.filter(
            user=user,
            status=EmailVerificationToken.Status.PENDING,
        ).exclude(id=keep_id).update(status=EmailVerificationToken.Status.EXPIRED)

    @staticmethod
    def mark_used(token):
        token.status = EmailVerificationToken.Status.USED
        token.used_at = timezone.now()
        token.save(update_fields=["status", "used_at"])


class PasswordResetTokenRepository:

    @staticmethod
    def create(user, expires_at):
        return PasswordResetToken.objects.create(user=user, expires_at=expires_at)

    @staticmethod
    def expire_pending_for_user(user):
        PasswordResetToken.objects.filter(
            user=user,
            status=PasswordResetToken.Status.PENDING,
        ).update(status=PasswordResetToken.Status.EXPIRED)

    @staticmethod
    def get_pending(token_value):
        return (
            PasswordResetToken.objects.filter(
                token=token_value, status=PasswordResetToken.Status.PENDING
            )
            .select_related("user")
            .first()
        )

    @staticmethod
    def mark_used(token):
        token.status = PasswordResetToken.Status.USED
        token.used_at = timezone.now()
        token.save(update_fields=["status", "used_at"])

    @staticmethod
    def mark_expired(token):
        token.status = PasswordResetToken.Status.EXPIRED
        token.save(update_fields=["status"])
