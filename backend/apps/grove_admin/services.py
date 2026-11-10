import secrets

import stripe
from django.conf import settings
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from django.utils import timezone

from apps.clients.models import Client
from apps.common.logger import logger
from apps.notifications.tasks import send_password_reset_email
from apps.request_management.models import Request
from apps.tenants.models import TenantMembership
from apps.users.services import PasswordResetService

from .repositories import (AdminActionRepository, PlanAdminRepository,
                           TenantAdminRepository, UserAdminRepository)

stripe.api_key = settings.STRIPE_SECRET_KEY


# custom exceptions
class InvalidAdminCredentials(Exception):
    pass


class AccountLocked(Exception):
    pass


class TenantNotFound(Exception):
    pass


class UserNotFound(Exception):
    pass


class PlanNotFound(Exception):
    pass


class InvalidLimitValue(Exception):
    pass


class InvalidPlanValue(Exception):
    pass


class StripePriceSyncError(Exception):
    pass


class GroveAdminAuthService:

    LOCKOUT_THRESHOLD = 5
    LOCKOUT_SECONDS = 15 * 60

    @staticmethod
    def _attempts_key(ip):
        return f"grove_admin_attempts:{ip}"

    @staticmethod
    def _lockout_key(ip):
        return f"grove_admin_lockout:{ip}"

    @staticmethod
    def authenticate(email, password, ip_address):
        if cache.get(GroveAdminAuthService._lockout_key(ip_address)):
            raise AccountLocked("Too many failed attempts. Try again latter")

        expected_email = settings.GROVE_ADMIN_EMAIL.lower().strip()
        expected_password = settings.GROVE_ADMIN_PASSWORD

        valid = secrets.compare_digest(
            email.lower().strip(), expected_email
        ) and secrets.compare_digest(password, expected_password)

        if not valid:
            attempts_key = GroveAdminAuthService._attempts_key(ip_address)
            attempts = (cache.get(attempts_key) or 0) + 1
            cache.set(
                attempts_key, attempts, timeout=GroveAdminAuthService.LOCKOUT_SECONDS
            )

            if attempts >= GroveAdminAuthService.LOCKOUT_THRESHOLD:
                cache.set(
                    GroveAdminAuthService._lockout_key(ip_address),
                    True,
                    timeout=GroveAdminAuthService.LOCKOUT_SECONDS,
                )
                logger.warning(
                    f"[grove_admin_auth] IP {ip_address} locked after {attempts} failed attempts."
                )
            else:
                logger.warning(
                    f"[grove_admin_auth] Failed login attempt {attempts} from IP {ip_address}."
                )

            raise InvalidAdminCredentials("Invalid email or password.")

        cache.delete(GroveAdminAuthService._attempts_key(ip_address))
        cache.delete(GroveAdminAuthService._lockout_key(ip_address))

        admin_user = UserAdminRepository.get_or_create_admin_user(expected_email)
        logger.info(f"[grove_admin_auth] Successful admin login from IP {ip_address}.")
        return admin_user


class StatsService:

    @staticmethod
    def get_dashboard_stats():
        now = timezone.now()
        week_ago = now - timezone.timedelta(days=7)
        two_weeks_ago = now - timezone.timedelta(days=14)

        total_tenants = TenantAdminRepository.count_total()
        total_users = UserAdminRepository.count_total_users()
        total_requests = Request.objects.filter(is_deleted=False).count()

        free_count = TenantAdminRepository.count_by_plan("free")
        pro_count = TenantAdminRepository.count_by_plan("pro")

        signups_this_week = TenantAdminRepository.signup_count_since(week_ago)
        signups_prior_week = TenantAdminRepository.signup_count_between(
            two_weeks_ago, week_ago
        )
        signup_delta = signups_this_week - signups_prior_week

        recent_tenants = TenantAdminRepository.recent(limit=5)

        at_limit = []
        for tenant, usage in TenantAdminRepository.free_tenants_with_usage():
            if usage is None:
                continue
            client_limit = tenant.effective_client_limit
            request_limit = tenant.plan.request_limit if tenant.plan else None
            client_maxed = client_limit != -1 and usage.client_count >= client_limit
            request_maxed = (
                request_limit not in (None, -1)
                and usage.active_request_count >= request_limit
            )
            if client_maxed or request_maxed:
                at_limit.append(tenant)

        return {
            "total_tenants": total_tenants,
            "total_users": total_users,
            "total_requests": total_requests,
            "free_count": free_count,
            "pro_count": pro_count,
            "signups_this_week": signups_this_week,
            "signup_delta": signup_delta,
            "recent_tenants": recent_tenants,
            "tenants_at_limit": at_limit,
        }


class TenantAdminService:

    @staticmethod
    def list_tenants(search=None, plan_name=None, status=None):
        tenants = list(
            TenantAdminRepository.search_and_filter(search, plan_name, status)
        )
        usage_map = TenantAdminRepository.usage_map([t.id for t in tenants])
        return [{"tenant": t, "usage": usage_map.get(t.id)} for t in tenants]

    @staticmethod
    def get_tenant_detail(tenant_id):
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")

        usage = TenantAdminRepository.get_usage(tenant)
        clients = Client.objects.filter(tenant=tenant, is_deleted=False).select_related(
            "user"
        )

        provider_membership = (
            TenantMembership.objects.filter(
                tenant=tenant, role=TenantMembership.Role.PROVIDER, is_active=True
            )
            .select_related("user")
            .first()
        )
        provider_email = provider_membership.user.email if provider_membership else None

        return {
            "tenant": tenant,
            "usage": usage,
            "clients": clients,
            "provider_email": provider_email,
        }

    @staticmethod
    @transaction.atomic
    def upgrade_to_pro(admin, tenant_id):
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")
        pro_plan = PlanAdminRepository.get_by_name("pro")
        if not pro_plan:
            raise PlanNotFound("Pro plan is not configured.")
        TenantAdminRepository.set_plan(tenant, pro_plan)
        TenantAdminRepository.set_client_limit_override(tenant, None)
        AdminActionRepository.log(
            admin, "upgrade_plan", "tenant", tenant.id, {"new_plan": "pro"}
        )
        logger.info(
            f"[grove_admin] Tenant {tenant.slug} upgraded to Pro by {admin.email}."
        )
        return tenant

    @staticmethod
    @transaction.atomic
    def downgrade_to_free(admin, tenant_id):
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")
        free_plan = PlanAdminRepository.get_by_name("free")
        if not free_plan:
            raise PlanNotFound("Free plan is not configured.")
        TenantAdminRepository.set_plan(tenant, free_plan)
        TenantAdminRepository.set_client_limit_override(tenant, None)
        AdminActionRepository.log(
            admin, "downgrade_plan", "tenant", tenant.id, {"new_plan": "free"}
        )
        logger.info(
            f"[grove_admin] Tenant {tenant.slug} downgraded to Free by {admin.email}."
        )
        return tenant

    @staticmethod
    @transaction.atomic
    def suspend(admin, tenant_id):
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")
        TenantAdminRepository.set_suspended(tenant, True)
        AdminActionRepository.log(admin, "suspend_tenant", "tenant", tenant.id)
        logger.warning(
            f"[grove_admin] Tenant {tenant.slug} suspended by {admin.email}."
        )
        return tenant

    @staticmethod
    @transaction.atomic
    def unsuspend(admin, tenant_id):
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")
        TenantAdminRepository.set_suspended(tenant, False)
        AdminActionRepository.log(admin, "unsuspend_tenant", "tenant", tenant.id)
        logger.info(f"[grove_admin] Tenant {tenant.slug} unsuspended by {admin.email}.")
        return tenant

    @staticmethod
    @transaction.atomic
    def override_client_limit(admin, tenant_id, limit):
        if limit is not None and limit != -1 and limit < 0:
            raise InvalidLimitValue(
                "Limit must be -1 (unlimited), null (clear override), or a positive integer."
            )
        tenant = TenantAdminRepository.get_by_id(tenant_id)
        if not tenant:
            raise TenantNotFound("Tenant not found.")
        TenantAdminRepository.set_client_limit_override(tenant, limit)
        AdminActionRepository.log(
            admin, "override_client_limit", "tenant", tenant.id, {"limit": limit}
        )
        logger.info(
            f"[grove_admin] Tenant {tenant.slug} client limit overridden to {limit} by {admin.email}."
        )
        return tenant


class UserAdminService:

    @staticmethod
    def list_users(search=None, role=None, status=None):
        return UserAdminRepository.search_and_filter(search, role, status)

    @staticmethod
    @transaction.atomic
    def send_password_reset(admin, user_id):
        user = UserAdminRepository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound("User not found.")

        result = PasswordResetService.request_reset(email=user.email)

        if result:
            membership = (
                TenantMembership.objects.filter(user=user, is_active=True)
                .select_related("tenant")
                .first()
            )
            tenant_slug = membership.tenant.slug if membership else None
            try:
                send_password_reset_email.delay(
                    user_email=result["user"].email,
                    display_name=result["user"].display_name,
                    token=str(result["reset_token"].token),
                    tenant_slug=tenant_slug,
                )
            except Exception as e:
                logger.error(
                    f"[grove_admin] Failed to queue password reset email for {user.email}: {e}"
                )

        AdminActionRepository.log(admin, "send_password_reset", "user", user.id)
        logger.info(
            f"[grove_admin] Password reset triggered for {user.email} by {admin.email}."
        )
        return user

    @staticmethod
    @transaction.atomic
    def toggle_deactivate(admin, user_id):
        user = UserAdminRepository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound("User not found.")

        new_state = not user.is_active
        UserAdminRepository.set_active(user, new_state)

        action_type = "reactivate_user" if new_state else "deactivate_user"
        AdminActionRepository.log(admin, action_type, "user", user.id)
        logger.info(
            f"[grove_admin] User {user.email} {'reactivated' if new_state else 'deactivated'} by {admin.email}."
        )
        return user


class PlanAdminService:

    @staticmethod
    def get_plan_overview():
        free_count = TenantAdminRepository.count_by_plan("free")
        pro_count = TenantAdminRepository.count_by_plan("pro")

        rows = []
        at_limit_count = 0
        for tenant, usage in TenantAdminRepository.all_tenants_with_usage():
            client_limit = tenant.effective_client_limit
            request_limit = tenant.plan.request_limit if tenant.plan else None
            client_count = usage.client_count if usage else 0
            request_count = usage.active_request_count if usage else 0

            client_maxed = client_limit != -1 and client_count >= client_limit
            request_maxed = (
                request_limit not in (None, -1) and request_count >= request_limit
            )
            if client_maxed or request_maxed:
                at_limit_count += 1

            rows.append(
                {
                    "tenant": tenant,
                    "client_count": client_count,
                    "client_limit": client_limit,
                    "request_count": request_count,
                    "request_limit": request_limit,
                }
            )

        return {
            "free_count": free_count,
            "pro_count": pro_count,
            "at_limit_count": at_limit_count,
            "rows": rows,
            "total_revenue": PlanAdminRepository.total_revenue(),
            "plans": PlanAdminRepository.get_all(),
        }

    @staticmethod
    @transaction.atomic
    def update_plan(
        admin, plan_id, price_monthly=None, client_limit=None, request_limit=None
    ):
        plan = PlanAdminRepository.get_by_id(plan_id)
        if not plan:
            raise PlanNotFound("Plan not found.")

        fields = {}

        if price_monthly is not None:
            if price_monthly < 0:
                raise InvalidPlanValue("Price must be zero or greater.")
            fields["price_monthly"] = price_monthly

        if client_limit is not None:
            if client_limit != -1 and client_limit < 0:
                raise InvalidPlanValue(
                    "Client limit must be -1 (unlimited) or a non-negative integer."
                )
            fields["client_limit"] = client_limit

        if request_limit is not None:
            if request_limit != -1 and request_limit < 0:
                raise InvalidPlanValue(
                    "Request limit must be -1 (unlimited) or a non-negative integer."
                )
            fields["request_limit"] = request_limit

        price_changed = (
            "price_monthly" in fields and fields["price_monthly"] != plan.price_monthly
        )
        if price_changed and plan.stripe_price_id:
            fields["stripe_price_id"] = PlanAdminService._swap_stripe_price(
                plan, fields["price_monthly"]
            )

        if fields:
            PlanAdminRepository.update_plan(plan, **fields)

        AdminActionRepository.log(
            admin,
            "update_plan",
            "plan",
            plan.id,
            {k: str(v) for k, v in fields.items()},
        )
        logger.info(
            f"[grove_admin] Plan {plan.name} updated by {admin.email}: {fields}"
        )
        return plan

    @staticmethod
    def _swap_stripe_price(plan, new_price_monthly):
        """
        Stripe Price objects are immutable. Existing subscriptions keep
        referencing the old price so current Pro tenants are unaffected only new
        checkouts pick up the new price.
        """
        try:
            old_price = stripe.Price.retrieve(plan.stripe_price_id)

            new_price = stripe.Price.create(
                product=old_price["product"],
                unit_amount=int(new_price_monthly * 100),
                currency=old_price["currency"],
                recurring={"interval": "month"},
            )

            stripe.Product.modify(old_price["product"], default_price=new_price["id"])

            stripe.Price.modify(old_price["id"], active=False)
        except stripe.error.StripeError as e:
            logger.error(
                f"[grove_admin] Stripe price sync failed for plan {plan.name}: {e}"
            )
            raise StripePriceSyncError(str(e))

        return new_price["id"]
