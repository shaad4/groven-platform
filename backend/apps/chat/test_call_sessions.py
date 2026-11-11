import uuid
from unittest.mock import patch
import pytest
from django.core.cache import cache
from apps.chat.call_sessions import handle, current
from apps.request_management.models import Request


@pytest.fixture
def call_request(tenant, client_profile, provider_user):
    cache.clear()
    return Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title='Call')


def offer():
    return {'type': 'call_offer', 'call_id': str(uuid.uuid4()), 'sdp': {'type': 'offer', 'sdp': 'test'}}


@pytest.mark.django_db
def test_offer_and_ice_replayed_until_answer(call_request, provider_user, client_user):
    message = offer()
    with patch('apps.chat.call_sessions.deliver_push.delay') as push, patch('apps.chat.call_sessions.push_enabled', return_value=True):
        allowed, alert = handle(call_request, provider_user, 'caller', message)
        assert allowed and alert[0] == str(client_user.id)
        push.assert_called_once()
    handle(call_request, provider_user, 'caller', {'type': 'ice_candidate', 'call_id': message['call_id'], 'candidate': {'candidate': 'ice'}})
    assert current(call_request.id)['candidates'] == [{'candidate': 'ice'}]
    answer = {'type': 'call_answer', 'call_id': message['call_id']}
    assert handle(call_request, client_user, 'answer-tab', answer)[0]
    assert current(call_request.id) is None
    assert not handle(call_request, client_user, 'other-tab', answer)[0]
    assert not handle(call_request, client_user, 'other-tab', {'type': 'call_end', 'call_id': message['call_id']})[0]
    assert handle(call_request, client_user, 'answer-tab', {'type': 'call_end', 'call_id': message['call_id']})[0]


@pytest.mark.django_db
def test_cancelled_or_expired_call_is_not_replayed(call_request, provider_user):
    message = offer()
    with patch('apps.chat.call_sessions.deliver_push.delay'):
        assert handle(call_request, provider_user, 'caller', message)[0]
    assert not handle(call_request, provider_user, 'caller', {**message, 'call_id': 'bad'})[0]
    assert handle(call_request, provider_user, 'caller', {'type': 'call_end', 'call_id': message['call_id']})[0]
    assert current(call_request.id) is None
