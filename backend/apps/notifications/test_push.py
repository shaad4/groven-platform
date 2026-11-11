import base64
from unittest.mock import patch
import pytest
from apps.notifications.models import PushSubscription
from apps.notifications.push import valid_endpoint, deliver_push


def subscription():
    return {'endpoint': 'https://fcm.googleapis.com/fcm/send/test-device', 'keys': {
        'p256dh': base64.urlsafe_b64encode(b'\x04' + b'a' * 64).decode().rstrip('='),
        'auth': base64.urlsafe_b64encode(b'b' * 16).decode().rstrip('='),
    }}


@pytest.fixture
def push_settings(settings):
    settings.WEB_PUSH_PUBLIC_KEY = 'public'
    settings.WEB_PUSH_PRIVATE_KEY = 'private'
    settings.WEB_PUSH_SUBJECT = 'mailto:admin@example.com'


@pytest.mark.parametrize('endpoint', ['http://fcm.googleapis.com/test', 'https://localhost/test',
    'https://127.0.0.1/test', 'https://fcm.googleapis.com.evil.test/test', 'https://user@fcm.googleapis.com/test',
    'https://fcm.googleapis.com:9000/test'])
def test_push_rejects_non_browser_endpoints(endpoint):
    assert not valid_endpoint(endpoint)


@pytest.mark.django_db
def test_push_registration_is_owned_and_tenant_scoped(provider_client, tenant, provider_user, client_user, client_membership, push_settings):
    from rest_framework.test import APIClient
    client_client = APIClient()
    client_client.force_authenticate(client_user)
    client_client.credentials(HTTP_X_TENANT_SLUG=tenant.slug)
    payload = subscription()
    assert provider_client.post('/api/notifications/push/', payload, format='json').status_code == 201
    saved = PushSubscription.objects.get()
    assert saved.user == provider_user and saved.tenant == tenant
    client_client.delete('/api/notifications/push/', {'endpoint': payload['endpoint']}, format='json')
    assert PushSubscription.objects.count() == 1
    provider_client.delete('/api/notifications/push/', {'endpoint': payload['endpoint']}, format='json')
    assert PushSubscription.objects.count() == 0


@pytest.mark.django_db
def test_invalid_keys_and_private_endpoints_are_rejected(provider_client, push_settings):
    payload = subscription(); payload['keys']['auth'] = 'invalid'
    assert provider_client.post('/api/notifications/push/', payload, format='json').status_code == 400
    payload = subscription(); payload['endpoint'] = 'https://127.0.0.1/internal'
    assert provider_client.post('/api/notifications/push/', payload, format='json').status_code == 400
    assert not PushSubscription.objects.exists()


@pytest.mark.django_db
def test_push_delivery_scopes_membership_and_expires_calls(provider_client, tenant, provider_user, push_settings):
    provider_client.post('/api/notifications/push/', subscription(), format='json')
    with patch('pywebpush.webpush') as send:
        deliver_push(str(tenant.id), str(provider_user.id), {'title': 'Hi'})
        send.assert_called_once()
        deliver_push(str(tenant.id), str(provider_user.id), {'kind': 'call', 'expires_at': 1})
        assert send.call_count == 1
        provider_user.memberships.update(is_active=False)
        deliver_push(str(tenant.id), str(provider_user.id), {'title': 'Hi'})
        assert send.call_count == 1
