from django.urls import path

from .views import (MarkAllReadView, MarkNotificationReadView,
                    NotificationListView)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path(
        "<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="notification-read"
    ),
    path("read-all/", MarkAllReadView.as_view(), name="notification-read-all"),
]
