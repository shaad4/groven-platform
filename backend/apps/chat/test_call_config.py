import base64
import hashlib
import hmac

import pytest

from apps.clients.models import Client
from apps.request_management.models import Request


@pytest.fixture(autouse=True)
def call_settings(settings):
    settings.STUN_URLS = ["stun:stun.example.com:3478"]
    settings.TURN_URLS = []
    settings.TURN_SHARED_SECRET = ""
    settings.TURN_CREDENTIAL_TTL = 3600
    return settings


@pytest.fixture
def call_request(tenant, client_profile, provider_user):
    return Request.objects.create(
        tenant=tenant, client=client_profile, provider=provider_user, title="Call"
    )


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ["provider_client", "client_client"])
def test_authorized_participants_receive_stun_fallback(request, actor, call_request):
    client = request.getfixturevalue(actor)
    response = client.get(f"/api/requests/{call_request.id}/call-config/")

    assert response.status_code == 200
    assert response.data == {
        "success": True,
        "data": {
            "ice_servers": [{"urls": ["stun:stun.example.com:3478"]}],
            "turn_available": False,
            "expires_at": None,
        },
    }
    assert "no-store" in response["Cache-Control"]


@pytest.mark.django_db
def test_turn_credentials_expire_and_do_not_expose_shared_secret(
    provider_client, provider_user, call_request, call_settings, monkeypatch
):
    call_settings.TURN_URLS = [
        "turn:relay.example.com:3478?transport=udp",
        "turns:relay.example.com:5349?transport=tcp",
    ]
    call_settings.TURN_SHARED_SECRET = "test-only-turn-secret"
    monkeypatch.setattr("apps.chat.call_config.time", lambda: 1700000000)

    response = provider_client.get(f"/api/requests/{call_request.id}/call-config/")
    assert response.status_code == 200
    data = response.data["data"]
    assert data["turn_available"] is True
    assert data["expires_at"] == 1700003600
    turn = data["ice_servers"][1]
    assert turn["urls"] == call_settings.TURN_URLS
    assert turn["username"] == f"1700003600:{provider_user.id}"
    expected = base64.b64encode(hmac.new(
        b"test-only-turn-secret", turn["username"].encode(), hashlib.sha1
    ).digest()).decode("ascii")
    assert turn["credential"] == expected
    assert b"test-only-turn-secret" not in response.content
    assert response["Cache-Control"] == "private, no-store, max-age=0"
    assert response["Pragma"] == "no-cache"


@pytest.mark.django_db
def test_anonymous_cannot_fetch_call_credentials(api_client, tenant, call_request):
    response = api_client.get(
        f"/api/requests/{call_request.id}/call-config/",
        HTTP_X_TENANT_SLUG=tenant.slug,
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_other_client_cannot_fetch_call_credentials(client_client, tenant, provider_user):
    other = Client.objects.create(
        tenant=tenant, provider=provider_user,
        client_name="Other", client_email="other@example.com",
    )
    private_request = Request.objects.create(
        tenant=tenant, client=other, provider=provider_user, title="Private"
    )
    response = client_client.get(f"/api/requests/{private_request.id}/call-config/")
    assert response.status_code == 404
    assert "data" not in response.data


@pytest.mark.django_db
def test_wrong_tenant_cannot_fetch_call_credentials(provider_client, call_request, pro_tenant):
    response = provider_client.get(
        f"/api/requests/{call_request.id}/call-config/",
        HTTP_X_TENANT_SLUG=pro_tenant.slug,
    )
    assert response.status_code in (403, 404)
    assert "data" not in response.data


@pytest.mark.django_db
def test_deleted_request_cannot_fetch_call_credentials(provider_client, call_request):
    call_request.is_deleted = True
    call_request.save(update_fields=["is_deleted"])
    response = provider_client.get(f"/api/requests/{call_request.id}/call-config/")
    assert response.status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize("urls, secret, ttl", [
    (["turn:relay.example.com:3478"], "", 3600),
    ([], "test-only-secret", 3600),
    (["https://relay.example.com"], "test-only-secret", 3600),
    (["turn:relay.example.com:3478"], "test-only-secret", 0),
    (["turn:relay.example.com:3478"], "test-only-secret", 86401),
])
def test_partial_or_invalid_turn_configuration_fails_without_credentials(
    provider_client, call_request, call_settings, urls, secret, ttl
):
    call_settings.TURN_URLS = urls
    call_settings.TURN_SHARED_SECRET = secret
    call_settings.TURN_CREDENTIAL_TTL = ttl
    response = provider_client.get(f"/api/requests/{call_request.id}/call-config/")
    assert response.status_code == 503
    assert "data" not in response.data
    assert "test-only-secret" not in str(response.data)
