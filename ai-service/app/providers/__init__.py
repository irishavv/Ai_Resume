"""Provider factory."""

from __future__ import annotations

import logging
from functools import lru_cache

from ..config import get_settings
from .base import LLMProvider, ProviderError

logger = logging.getLogger(__name__)


@lru_cache
def get_provider() -> LLMProvider:
    """Return the configured provider, falling back to the mock when unusable."""
    settings = get_settings()
    if settings.resolved_provider == "groq":
        from .groq import GroqProvider

        logger.info("LLM provider: groq (model=%s)", settings.groq_model)
        return GroqProvider(settings)

    if settings.ai_provider == "groq":
        logger.warning(
            "AI_PROVIDER is 'groq' but GROQ_API_KEY is not set; falling back to the "
            "deterministic mock provider."
        )

    from .mock import MockProvider

    return MockProvider(settings)


def clear_provider_cache() -> None:
    """Drop the cached provider (used by tests when overriding the environment)."""
    get_provider.cache_clear()


__all__ = ["LLMProvider", "ProviderError", "get_provider", "clear_provider_cache"]
