from django.urls import re_path

from apps.chat.routing import websocket_urlpatterns as chat_ws
from apps.notifications.consumers import NotificationFeedConsumer

websocket_urlpatterns = [
    *chat_ws,
    re_path(r"^ws/feed/$", NotificationFeedConsumer.as_asgi()),
]
