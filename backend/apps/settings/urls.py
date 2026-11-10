from django.urls import path

from .views import (AvatarUploadView, DeleteAccountView, LogoUploadView,
                    NotificationSettingsView, ProfileSettingsView,
                    WorkspaceSettingsView)

urlpatterns = [
    # Profile — both roles
    path("profile/", ProfileSettingsView.as_view()),
    path("avatar/", AvatarUploadView.as_view()),
    # Workspace — provider only
    path("workspace/", WorkspaceSettingsView.as_view()),
    path("logo/", LogoUploadView.as_view()),
    # Notifications — both roles, role-aware response
    path("notifications/", NotificationSettingsView.as_view()),
    # Leave workspace — both roles
    path("delete-account/", DeleteAccountView.as_view()),
]
