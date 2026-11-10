from django.urls import path

from .views import TenantPublicInfoView, ValidateTenantView, PWAManifestView

urlpatterns = [
    path("validate/", ValidateTenantView.as_view(), name="tenant-validate"),
    path("info/", TenantPublicInfoView.as_view()),
    path("manifest.json", PWAManifestView.as_view(), name="pwa-manifest"),
]
