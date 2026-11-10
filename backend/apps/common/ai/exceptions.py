class AIServiceError(Exception):
    """Raised when the AI provider call fails (non-retryable or after retries)."""

    pass


class AIRateLimitError(AIServiceError):
    """Raised on a 429 from the AI provider — safe to retry."""

    pass
