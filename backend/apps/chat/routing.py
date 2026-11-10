from django.urls import path

from .consumers import RequestChatConsumer

websocket_urlpatterns = [
    path("ws/chat/<uuid:request_id>/", RequestChatConsumer.as_asgi()),
]
