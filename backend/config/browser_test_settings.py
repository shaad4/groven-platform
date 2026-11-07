"""Local-only browser rehearsal against disposable integration services."""
from datetime import timedelta
from .integration_test_settings import *  # noqa: F403

ALLOWED_HOSTS = ['.groven.localhost', 'localhost', '127.0.0.1']
COOKIE_DOMAIN = '.groven.localhost'
FRONTEND_URL = 'https://groven.localhost:59443'
CSRF_TRUSTED_ORIGINS = ['https://*.groven.localhost:59443']
CORS_ALLOWED_ORIGINS = ['https://check.groven.localhost:59443']
SIMPLE_JWT = {**SIMPLE_JWT, 'ACCESS_TOKEN_LIFETIME': timedelta(seconds=8)}  # noqa: F405
# No worker is run during the rehearsal; prevent external task execution.
CELERY_TASK_ALWAYS_EAGER = False

# Capture real application log records for the local credential-leak regression.
LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'handlers': {'file': {'class': 'logging.FileHandler',
                          'filename': '/tmp/groven-ws-app-events.log'}},
    'root': {'handlers': ['file'], 'level': 'INFO'},
    'loggers': {'apps.common.logger': {'handlers': ['file'], 'level': 'INFO', 'propagate': False}},
}
