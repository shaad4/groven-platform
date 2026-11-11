from django.urls import path

from .views import CallConfigView, MarkMessagesReadView, MessageListCreateView

urlpatterns = [
    path(
        "requests/<uuid:request_id>/call-config/",
        CallConfigView.as_view(),
        name="request-call-config",
    ),
    path(
        "requests/<uuid:request_id>/messages/",
        MessageListCreateView.as_view(),
        name="message-list-create",
    ),
    path(
        "requests/<uuid:request_id>/messages/mark-read/",
        MarkMessagesReadView.as_view(),
        name="messages-mark-read",
    ),
]
