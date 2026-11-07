from unittest.mock import patch

import pytest
from django.test import override_settings
from apps.common.ai.client import _get_client
from apps.common.ai.exceptions import AIServiceError


@pytest.fixture(autouse=True)
def clear_clients():
    _get_client.cache_clear()
    yield
    _get_client.cache_clear()


def test_optional_provider_reports_service_error_without_constructing_client():
    with override_settings(GROQ_API_KEY=""), patch("apps.common.ai.client.OpenAI") as constructor:
        with pytest.raises(AIServiceError, match="groq is not configured"):
            _get_client("groq")
        constructor.assert_not_called()


def test_configured_provider_is_created_once_and_reused():
    with override_settings(GEMINI_API_KEY="test-only"), patch("apps.common.ai.client.OpenAI") as constructor:
        assert _get_client("gemini") is _get_client("gemini")
        constructor.assert_called_once()
