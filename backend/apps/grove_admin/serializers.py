from rest_framework import serializers


class GroveAdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AdminStatsSerializer(serializers.Serializer):
    def to_representation(self, data):
        return {
            "total_tenants": data["total_tenants"],
            "total_users": data["total_users"],
            "total_requests": data["total_requests"],
            "free_count": data["free_count"],
            "pro_count": data["pro_count"],
            "signups_this_week": data["signups_this_week"],
            "signup_delta": data["signup_delta"],
            "recent_tenants": [
                {
                    "id": str(t.id),
                    "name": t.name,
                    "slug": t.slug,
                    "plan": t.plan.name if t.plan else None,
                    "joined_at": t.created_at,
                }
                for t in data["recent_tenants"]
            ],
            "tenants_at_limit": [
                {"id": str(t.id), "name": t.name, "slug": t.slug}
                for t in data["tenants_at_limit"]
            ],
        }


class AdminTenantListSerializer(serializers.Serializer):
    def to_representation(self, row):
        tenant, usage = row["tenant"], row["usage"]
        return {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "logo_url": tenant.logo_url,
            "plan": tenant.plan.name if tenant.plan else None,
            "client_count": usage.client_count if usage else 0,
            "client_limit": tenant.effective_client_limit,
            "request_count": usage.active_request_count if usage else 0,
            "request_limit": tenant.plan.request_limit if tenant.plan else None,
            "is_suspended": tenant.is_suspended,
            "created_at": tenant.created_at,
        }


class AdminTenantDetailSerializer(serializers.Serializer):
    def to_representation(self, data):
        tenant, usage = data["tenant"], data["usage"]
        return {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "logo_url": tenant.logo_url,
            "provider_email": data["provider_email"],
            "plan": tenant.plan.name if tenant.plan else None,
            "is_suspended": tenant.is_suspended,
            "created_at": tenant.created_at,
            "client_count": usage.client_count if usage else 0,
            "client_limit": tenant.effective_client_limit,
            "request_count": usage.active_request_count if usage else 0,
            "request_limit": tenant.plan.request_limit if tenant.plan else None,
            "clients": [
                {
                    "id": str(c.id),
                    "name": c.client_name or (c.user.display_name if c.user else None),
                    "email": c.client_email or (c.user.email if c.user else None),
                }
                for c in data["clients"]
            ],
        }


class OverrideLimitSerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, allow_null=True)


class AdminUserListSerializer(serializers.Serializer):
    def to_representation(self, membership):
        return {
            "id": str(membership.user.id),
            "email": membership.user.email,
            "display_name": membership.user.display_name,
            "avatar_url": membership.user.avatar_url,
            "role": membership.role,
            "tenant_slug": membership.tenant.slug,
            "joined_at": membership.joined_at,
            "last_login": membership.user.last_login,
            "is_active": membership.user.is_active,
        }


class AdminPlanOverviewSerializer(serializers.Serializer):
    def to_representation(self, data):
        return {
            "free_count": data["free_count"],
            "pro_count": data["pro_count"],
            "at_limit_count": data["at_limit_count"],
            "total_revenue": str(data["total_revenue"]),
            "plans": PlanConfigSerializer(data["plans"], many=True).data,
            "rows": [
                {
                    "tenant_id": str(row["tenant"].id),
                    "tenant_name": row["tenant"].name,
                    "logo_url": row["tenant"].logo_url,
                    "plan": row["tenant"].plan.name if row["tenant"].plan else None,
                    "client_count": row["client_count"],
                    "client_limit": row["client_limit"],
                    "request_count": row["request_count"],
                    "request_limit": row["request_limit"],
                }
                for row in data["rows"]
            ],
        }


class PlanConfigSerializer(serializers.Serializer):
    def to_representation(self, plan):
        return {
            "id": str(plan.id),
            "name": plan.name,
            "price_monthly": str(plan.price_monthly),
            "client_limit": plan.client_limit,
            "request_limit": plan.request_limit,
            "has_stripe_price": bool(plan.stripe_price_id),
        }


class PlanUpdateSerializer(serializers.Serializer):
    price_monthly = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    client_limit = serializers.IntegerField(required=False, allow_null=True)
    request_limit = serializers.IntegerField(required=False, allow_null=True)
