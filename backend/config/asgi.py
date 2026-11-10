import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from apps.tenants.ws_middleware import JWTTenantAuthMiddleware
from config.ws_routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTTenantAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
