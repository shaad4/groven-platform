"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

from apps.plans.urls import webhook_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/clients/", include("apps.clients.urls")),
    path("api/tenants/", include("apps.tenants.urls")),
    path("api/requests/", include("apps.request_management.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/", include("apps.chat.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/settings/", include("apps.settings.urls")),
    path("api/billing/", include("apps.plans.urls")),
    path("api/webhooks/", include(webhook_urlpatterns)),
    path("api/grove-admin/", include("apps.grove_admin.urls")),
]
