"""Issue short-lived TURN REST credentials without exposing the shared secret."""

import base64
import hashlib
import hmac
from time import time

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def build_call_config(user_id):
    stun_urls = settings.STUN_URLS or ["stun:stun.l.google.com:19302"]
    turn_urls = settings.TURN_URLS
    secret = settings.TURN_SHARED_SECRET
    if any(not url.startswith(("stun:", "stuns:")) for url in stun_urls):
        raise ImproperlyConfigured("STUN_URLS must contain STUN URLs.")
    if any(not url.startswith(("turn:", "turns:")) for url in turn_urls):
        raise ImproperlyConfigured("TURN_URLS must contain TURN URLs.")
    if bool(turn_urls) != bool(secret):
        raise ImproperlyConfigured("TURN URLs and shared secret must be configured together.")

    ice_servers = [{"urls": stun_urls}]
    expires_at = None
    if turn_urls:
        lifetime = settings.TURN_CREDENTIAL_TTL
        if not 300 <= lifetime <= 86400:
            raise ImproperlyConfigured("TURN credential lifetime must be 300–86400 seconds.")
        expires_at = int(time()) + lifetime
        username = f"{expires_at}:{user_id}"
        credential = base64.b64encode(
            hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()
        ).decode("ascii")
        ice_servers.append({
            "urls": turn_urls,
            "username": username,
            "credential": credential,
        })

    return {
        "ice_servers": ice_servers,
        "turn_available": bool(turn_urls),
        "expires_at": expires_at,
    }
