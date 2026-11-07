"""Isolated tests: no production credentials, Redis, email, or PostgreSQL required."""
import os

for name, value in {
    "SECRET_KEY": "test-only-secret-key-not-for-production-1234567890",
    "DEBUG": "False", "DB_NAME": "test", "DB_USER": "test",
    "DB_PASSWORD": "test", "DB_HOST": "localhost", "DB_PORT": "5432",
    "FRONTEND_URL": "http://localhost:5173", "GOOGLE_CLIENT_ID": "test",
    "AWS_ACCESS_KEY_ID": "test", "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_STORAGE_BUCKET_NAME": "test", "GEMINI_API_KEY": "test", "GROQ_API_KEY": "test",
    "GROVE_ADMIN_EMAIL": "admin@example.com", "GROVE_ADMIN_PASSWORD": "test",
}.items():
    os.environ.setdefault(name, value)

from .settings import *  # noqa: F403,E402

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
ALLOWED_HOSTS = ["testserver", "localhost"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CELERY_TASK_ALWAYS_EAGER = True
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
LOGGING = {"version": 1, "disable_existing_loggers": False,
           "handlers": {"null": {"class": "logging.NullHandler"}},
           "root": {"handlers": ["null"]}}
