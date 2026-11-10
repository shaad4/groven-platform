from django.db.models import Q

from apps.tenants.models import (BillingHistory, Plan, Tenant,
                                 TenantMembership, TenantUsage)
from apps.users.models import User

from .models import AdminAction


class AdminActionRepository:

    @staticmethod
    def log(admin, action_type, target_type, target_id, metadata=None):
        return AdminAction.objects.create(
            admin=admin,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            metadata=metadata,
        )


class TenantAdminRepository:

    @staticmethod
    def get_queryset():
        return Tenant.objects.select_related("plan").order_by("-created_at")

    @staticmethod
    def search_and_filter(search=None, plan_name=None, status=None):
        qs = TenantAdminRepository.get_queryset()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))
        if plan_name:
            qs = qs.filter(plan__name=plan_name)
        if status == "active":
            qs = qs.filter(is_suspended=False)
        elif status == "suspended":
            qs = qs.filter(is_suspended=True)
        return qs

    @staticmethod
    def get_by_id(tenant_id):
        return TenantAdminRepository.get_queryset().filter(id=tenant_id).first()

    @staticmethod
    def usage_map(tenant_ids):
        rows = TenantUsage.objects.filter(tenant_id__in=tenant_ids)
        return {row.tenant_id: row for row in rows}

    @staticmethod
    def get_usage(tenant):
        return TenantUsage.objects.filter(tenant=tenant).first()

    @staticmethod
    def count_total():
        return Tenant.objects.count()

    @staticmethod
    def count_by_plan(plan_name):
        return Tenant.objects.filter(plan__name=plan_name).count()

    @staticmethod
    def recent(limit=5):
        return TenantAdminRepository.get_queryset()[:limit]

    @staticmethod
    def signup_count_since(since_dt):
        return Tenant.objects.filter(created_at__gte=since_dt).count()

    @staticmethod
    def signup_count_between(start_dt, end_dt):
        return Tenant.objects.filter(
            created_at__gte=start_dt, created_at__lt=end_dt
        ).count()

    @staticmethod
    def free_tenants_with_usage():
        """All free-plan tenants paired with their usage row, for at-limit calc."""
        free_tenants = list(
            Tenant.objects.select_related("plan").filter(plan__name="free")
        )
        usage_map = TenantAdminRepository.usage_map([t.id for t in free_tenants])
        return [(t, usage_map.get(t.id)) for t in free_tenants]

    @staticmethod
    def all_tenants_with_usage():
        tenants = list(Tenant.objects.select_related("plan").order_by("name"))
        usage_map = TenantAdminRepository.usage_map([t.id for t in tenants])
        return [(t, usage_map.get(t.id)) for t in tenants]

    @staticmethod
    def set_plan(tenant, plan):
        tenant.plan = plan
        tenant.save(update_fields=["plan", "updated_at"])
        return tenant

    @staticmethod
    def set_suspended(tenant, suspended: bool):
        tenant.is_suspended = suspended
        tenant.save(update_fields=["is_suspended", "updated_at"])
        return tenant

    @staticmethod
    def set_client_limit_override(tenant, limit):
        tenant.client_limit_override = limit
        tenant.save(update_fields=["client_limit_override", "updated_at"])
        return tenant


class UserAdminRepository:

    @staticmethod
    def get_queryset():
        """
        Listing is membership-based, not user-based — a global user can have
        one row per tenant (role + tenant slug differ per row), matching the
        documented table columns (Role, Tenant slug, Joined date per row).
        """
        return TenantMembership.objects.select_related("user", "tenant").order_by(
            "-joined_at"
        )

    @staticmethod
    def search_and_filter(search=None, role=None, status=None):
        qs = UserAdminRepository.get_queryset()
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(user__display_name__icontains=search)
            )
        if role:
            qs = qs.filter(role=role)
        if status == "active":
            qs = qs.filter(user__is_active=True)
        elif status == "deactivated":
            qs = qs.filter(user__is_active=False)
        return qs

    @staticmethod
    def count_total_users():
        return User.objects.filter(is_superuser=False).count()

    @staticmethod
    def get_user_by_id(user_id):
        return User.objects.filter(id=user_id, is_superuser=False).first()

    @staticmethod
    def set_active(user, is_active: bool):
        user.is_active = is_active
        user.save(update_fields=["is_active", "updated_at"])
        return user

    @staticmethod
    def get_or_create_admin_user(email):
        """
        Provisions the single Groven Admin identity as a real superuser row so
        existing JWTAuthentication / BelongsToTenant / TenantMiddleware keep
        working unchanged. Credential truth lives in env vars, not this row —
        password is intentionally unusable.
        """
        user, created = User.objects.get_or_create(
            email=email.lower().strip(),
            defaults={
                "display_name": "Groven Admin",
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        return user


class PlanAdminRepository:

    @staticmethod
    def get_all():
        return Plan.objects.filter(is_active=True).order_by("price_monthly")

    @staticmethod
    def get_by_name(name):
        return Plan.objects.filter(name=name).first()

    @staticmethod
    def get_by_id(plan_id):
        return Plan.objects.filter(id=plan_id).first()

    @staticmethod
    def update_plan(plan, **fields):
        for field, value in fields.items():
            setattr(plan, field, value)
        plan.save(update_fields=list(fields.keys()))
        return plan

    @staticmethod
    def total_revenue():
        """Lifetime revenue from paid Stripe invoices/checkouts."""
        amounts = BillingHistory.objects.filter(
            status=BillingHistory.Status.PAID
        ).values_list("amount", flat=True)
        return sum(amounts) or 0
