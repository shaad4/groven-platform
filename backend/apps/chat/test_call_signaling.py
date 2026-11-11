from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from asgiref.sync import async_to_sync

from apps.chat.consumers import RequestChatConsumer


SIGNAL_TYPES = ["call_offer", "call_answer", "ice_candidate", "call_end", "call_busy", "call_media"]


def consumer(user_id="receiver", channel="receiver-tab"):
    socket = RequestChatConsumer()
    socket.user = SimpleNamespace(id=user_id)
    socket.channel_name = channel
    socket.group_name = "request-chat"
    socket.channel_layer = SimpleNamespace(group_send=AsyncMock())
    socket.send_json = AsyncMock()
    return socket


def signal(signal_type, sender="receiver", channel="sender-tab"):
    return {
        "type": "call_signal",
        "sender_id": sender,
        "sender_channel": channel,
        "payload": {"type": signal_type, "call_id": "call-1"},
    }


@pytest.mark.parametrize("signal_type", SIGNAL_TYPES)
def test_call_signals_never_echo_to_originating_connection(signal_type):
    socket = consumer()
    async_to_sync(socket.call_signal)(signal(signal_type, channel=socket.channel_name))
    socket.send_json.assert_not_awaited()


@pytest.mark.parametrize("signal_type", SIGNAL_TYPES)
def test_only_answers_and_hangups_echo_to_sibling_tabs(signal_type):
    socket = consumer()
    async_to_sync(socket.call_signal)(signal(signal_type))
    if signal_type in ("call_answer", "call_end"):
        socket.send_json.assert_awaited_once_with({
            "type": signal_type, "call_id": "call-1", "same_user": True,
        })
    else:
        socket.send_json.assert_not_awaited()


@pytest.mark.parametrize("signal_type", SIGNAL_TYPES)
def test_other_participant_signals_override_untrusted_same_user_marker(signal_type):
    socket = consumer()
    event = signal(signal_type, sender="other-user")
    event["payload"].update(same_user=True, sender_channel="untrusted-channel")
    async_to_sync(socket.call_signal)(event)
    socket.send_json.assert_awaited_once_with({
        "type": signal_type, "call_id": "call-1", "same_user": False,
    })


@pytest.mark.django_db(transaction=True)
def test_origin_channel_is_stamped_server_side_for_group_delivery():
    socket = consumer()
    payload = {"type": "call_media", "call_id": "call-1", "sender_channel": "forged"}
    socket._get_request = AsyncMock(return_value=SimpleNamespace())
    with patch('apps.chat.call_sessions.handle', return_value=(True, None)):
        async_to_sync(socket.receive_json)(payload)
    event = socket.channel_layer.group_send.await_args.args[1]
    assert event["sender_id"] == "receiver"
    assert event["sender_channel"] == "receiver-tab"
