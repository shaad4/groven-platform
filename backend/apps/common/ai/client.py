from functools import lru_cache

from django.conf import settings
from openai import APIConnectionError, APIError, OpenAI, RateLimitError

from apps.common.logger import logger

from .exceptions import AIRateLimitError, AIServiceError

@lru_cache(maxsize=2)
def _get_client(provider):
    """Create optional AI clients only when a request needs that provider."""
    prefix = provider.upper()
    api_key = getattr(settings, f"{prefix}_API_KEY", "")
    if not api_key:
        raise AIServiceError(f"{provider} is not configured.")
    return OpenAI(api_key=api_key, base_url=getattr(settings, f"{prefix}_BASE_URL"))


class AIService:
    """
    Gemini free tier first; falls back to Groq automatically if Gemini
    is rate-limited, out of quota, or otherwise unavailable.
    """

    @staticmethod
    def complete(system, user, model=None, max_tokens=300, temperature=0.4):
        model = model or settings.AI_MODEL_QUALITY
        try:
            return AIService._call(
                _get_client("gemini"), model, system, user, max_tokens, temperature
            )
        except (AIRateLimitError, AIServiceError) as e:
            logger.info(f"[AIService] Gemini unavailable ({e}), falling back to Groq")
            return AIService._call(
                _get_client("groq"),
                settings.AI_FALLBACK_MODEL,
                system,
                user,
                max_tokens,
                temperature,
            )

    @staticmethod
    def _call(client, model, system, user, max_tokens, temperature):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return resp.choices[0].message.content.strip()
        except RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except (APIError, APIConnectionError) as e:
            raise AIServiceError(str(e)) from e
