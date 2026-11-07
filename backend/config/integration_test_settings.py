"""Disposable local PostgreSQL/Redis checks; never use for deployment."""
from .test_settings import *  # noqa: F403

DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": "groven_check", "USER": "groven_check",
    "PASSWORD": "local-test-only", "HOST": "127.0.0.1", "PORT": "55432",
}}
CACHES = {"default": {
    "BACKEND": "django.core.cache.backends.redis.RedisCache",
    "LOCATION": "redis://127.0.0.1:56379/14",
}}
CHANNEL_LAYERS = {"default": {
    "BACKEND": "channels_redis.core.RedisChannelLayer",
    "CONFIG": {"hosts": ["redis://127.0.0.1:56379/15"]},
}}
