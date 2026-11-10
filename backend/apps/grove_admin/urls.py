from django.urls import path

from .views import (AdminPlanListView, AdminPlanUpdateView, AdminStatsView,
                    AdminTenantDetailView, AdminTenantDowngradeView,
                    AdminTenantListView, AdminTenantOverrideLimitView,
                    AdminTenantSuspendView, AdminTenantUnsuspendView,
                    AdminTenantUpgradeView, AdminUserDeactivateView,
                    AdminUserListView, AdminUserSendPasswordResetView,
                    GroveAdminLoginView, GroveAdminLogoutView,
                    GroveAdminTokenRefreshView)

urlpatterns = [
    path("login/", GroveAdminLoginView.as_view()),
    path("token/refresh/", GroveAdminTokenRefreshView.as_view()),
    path("stats/", AdminStatsView.as_view()),
    path("tenants/", AdminTenantListView.as_view()),
    path("tenants/<uuid:tenant_id>/", AdminTenantDetailView.as_view()),
    path("tenants/<uuid:tenant_id>/upgrade/", AdminTenantUpgradeView.as_view()),
    path("tenants/<uuid:tenant_id>/downgrade/", AdminTenantDowngradeView.as_view()),
    path("tenants/<uuid:tenant_id>/suspend/", AdminTenantSuspendView.as_view()),
    path("tenants/<uuid:tenant_id>/unsuspend/", AdminTenantUnsuspendView.as_view()),
    path(
        "tenants/<uuid:tenant_id>/override-limit/",
        AdminTenantOverrideLimitView.as_view(),
    ),
    path("users/", AdminUserListView.as_view()),
    path(
        "users/<uuid:user_id>/send-password-reset/",
        AdminUserSendPasswordResetView.as_view(),
    ),
    path("users/<uuid:user_id>/deactivate/", AdminUserDeactivateView.as_view()),
    path("plans/", AdminPlanListView.as_view()),
    path("plans/<uuid:plan_id>/update/", AdminPlanUpdateView.as_view()),
    path("auth/logout/", GroveAdminLogoutView.as_view()),
]
