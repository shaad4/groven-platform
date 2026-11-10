from django.db import transaction
from django.utils import timezone

from apps.common.logger import logger
from apps.tenants.models import Plan, Tenant, TenantMembership, TenantUsage

from .repositories import (EmailVerificationTokenRepository,
                           PasswordResetTokenRepository, UserRepository)

# custom Exceptions


class EmailAlreadyVerified(Exception):
    pass


class InvalidOrExpiredToken(Exception):
    pass


class NoProviderMembership(Exception):
    """User exists but has no provider membership in the resolved tenant."""

    pass


class AccountDeactivated(Exception):
    pass


class ProviderSignupService:
    """
    Handles the two-step provider onboarding:
      Step 1 — create global user account + send verification email
      Step 2 — after email verified, create tenant workspace + membership
    """

    @staticmethod
    @transaction.atomic
    def register(email, password, display_name):
        """
        Create a new (unverified) global user and issue a verification token.
        Returns {user, verification_token} for the view to dispatch the email task.
        """

        user = UserRepository.create_user(
            email=email,
            password=password,
            display_name=display_name,
            is_active=False,
        )

        verification_token = EmailVerificationTokenRepository.create(
            user=user, expires_at=timezone.now() + timezone.timedelta(minutes=30)
        )

        logger.info("user_registered user_id=%s email=%s", user.id, user.email)

        return {"user": user, "verification_token": verification_token}

    @staticmethod
    @transaction.atomic
    def verify_email(token_value):
        """
        Activate the user after they click the verification link.
        Returns {user, refresh_token} — view issues JWT from refresh_token.
        """
        token = EmailVerificationTokenRepository.get_pending(token_value)

        if token is None:
            logger.warning("email_verification_token_invalid token=%s", token_value)
            raise InvalidOrExpiredToken("Invalid or already-used verification token.")

        if token.expires_at < timezone.now():
            token.status = token.Status.EXPIRED
            token.save(update_fields=["status"])
            logger.warning("email_verfication_token_expired user_id=%s", token.user_id)
            raise InvalidOrExpiredToken("This verification link has expired.")

        user = token.user

        UserRepository.activate(user)
        EmailVerificationTokenRepository.expire_others(user, keep_id=token.id)
        EmailVerificationTokenRepository.mark_used(token)

        logger.info("user_verified_email user_id=%s email=%s", user.id, user.email)

        return {"user": user}

    @staticmethod
    @transaction.atomic
    def setup_workspace(user, buisness_name, slug):
        """
        Create the tenant workspace and give the provider their membership.
        """

        free_plan = Plan.objects.get(name="free")

        tenant = Tenant.objects.create(
            plan=free_plan,
            name=buisness_name,
            slug=slug,
        )

        TenantUsage.objects.create(tenant=tenant)

        # This membership is what makes the user a "provider" in this tenant
        membership = TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role=TenantMembership.Role.PROVIDER,
        )
        logger.info(
            "membership_created tenant_id=%s provider_id=%s slug=%s",
            tenant.id,
            user.id,
            tenant.slug,
        )
        return {"tenant": tenant, "membership": membership}


class ProviderLoginService:
    """
    Resolves role from TenantMembership after credential check
    """

    @staticmethod
    def resolve_provider_membership(user, tenant):
        """
        Confirm this user is a provider in the given tenant.
        Raises NoProviderMembership if not.
        """

        membership = TenantMembership.objects.filter(
            user=user,
            tenant=tenant,
            role=TenantMembership.Role.PROVIDER,
            is_active=True,
        ).first()

        if membership is None:
            logger.warning(
                "provider_membership_not_found user_id=%s tenant_id=%s",
                user.id,
                tenant.id,
            )
            raise NoProviderMembership("No provider account found for this workspace.")

        return membership


class PasswordResetService:
    """
    Token-based password reset. Works for any user regardless of role.
    """

    @staticmethod
    @transaction.atomic
    def request_reset(email):
        """
        Issue a reset token if the email exists.
        """

        user = UserRepository.get_by_email(email)
        if user is None or not user.is_active:
            logger.warning(
                "password_reset_requested_for_invalid_user email=%s", user.email
            )
            return None

        PasswordResetTokenRepository.expire_pending_for_user(user)

        reset_token = PasswordResetTokenRepository.create(
            user=user, expires_at=timezone.now() + timezone.timedelta(minutes=30)
        )

        logger.info("password_reset_requested user=%s email=%s", user.id, user.email)

        return {"user": user, "reset_token": reset_token}

    @staticmethod
    @transaction.atomic
    def confirm_reset(token_value, new_password):
        """Apply the new password and expire the token."""

        token = PasswordResetTokenRepository.get_pending(token_value)

        if token is None:
            logger.warning("password_reset_token_invalid")
            raise InvalidOrExpiredToken("Invalid or already-used reset link.")

        if token.expires_at < timezone.now():
            logger.warning("password_reset_token_expired user=%s", token.user.id)
            PasswordResetTokenRepository.mark_expired(token)
            raise InvalidOrExpiredToken(
                "Reset link has expired. Please request a new one."
            )

        UserRepository.set_password(token.user, new_password)
        PasswordResetTokenRepository.mark_used(token)

        logger.info("password_reset_completed user=%s", token.user.id)
