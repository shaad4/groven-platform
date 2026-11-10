from django.urls import path

from .views import (CheckSlugAPIView, ForgotPasswordView, GoogleAuthView,
                    LoginView, LogoutView, MembershipsView, MeView,
                    ProviderSignupView, RefreshTokenView, ResetPasswordView,
                    VerifyEmailAPIView, WorkspaceSetupAPIView)

urlpatterns = [
    path("register/", ProviderSignupView.as_view(), name="provider-signup"),
    path("verify-email/", VerifyEmailAPIView.as_view(), name="verify-email"),
    path("setup-workspace/", WorkspaceSetupAPIView.as_view(), name="setup-workspace"),
    path("check-slug/", CheckSlugAPIView.as_view(), name="check-slug"),
    path("login/", LoginView.as_view(), name="login"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forget-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("memberships/", MembershipsView.as_view(), name="memberships"),
]
