from django.urls import path

from .views import (AcceptInviteView, ClientDeactivateView, ClientDetailView,
                    ClientForgotPasswordView, ClientListCreateView,
                    ClientLoginView, ClientReactivateView,
                    ClientResendInviteView, ClientResetPasswordView,
                    ValidateInviteTokenView)

urlpatterns = [
    path("", ClientListCreateView.as_view(), name="client-list-create"),
    path("invite/validate/", ValidateInviteTokenView.as_view(), name="invite-validate"),
    path("invite/accept/", AcceptInviteView.as_view(), name="invite-accept"),
    path("login/", ClientLoginView.as_view(), name="client-login"),
    path(
        "forgot-password/",
        ClientForgotPasswordView.as_view(),
        name="client-forgot-password",
    ),
    path(
        "reset-password/",
        ClientResetPasswordView.as_view(),
        name="client-reset-password",
    ),
    path("<uuid:client_id>/", ClientDetailView.as_view(), name="client-detail"),
    path(
        "<uuid:client_id>/deactivate/",
        ClientDeactivateView.as_view(),
        name="client-deactivate",
    ),
    path(
        "<uuid:client_id>/reactivate/",
        ClientReactivateView.as_view(),
        name="client-reactivate",
    ),
    path(
        "<uuid:client_id>/resend-invite/",
        ClientResendInviteView.as_view(),
        name="client-resend-invite",
    ),
]
