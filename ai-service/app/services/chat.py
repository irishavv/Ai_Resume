"""Chat orchestration: request preparation, history trimming and the answer stream."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import AsyncIterator, Sequence

from ..config import Settings, get_settings
from ..providers import get_provider
from ..schemas import CandidateProfile, ChatMessage, ChatRequest
from .security import neutralise

logger = logging.getLogger(__name__)

#: Maximum accepted length for a single message before it is truncated.
MAX_MESSAGE_CHARS = 4000


@dataclass(frozen=True)
class PreparedChat:
    """A validated and sanitised chat request."""

    profile: CandidateProfile
    history: list[ChatMessage]
    question: str
    guard: bool
    language: str


def prepare(request: ChatRequest) -> PreparedChat:
    """Sanitise the request and trim the conversation history."""
    settings = get_settings()
    question, labels = neutralise(request.question, max_length=2000)
    if labels:
        logger.warning("Prompt-injection patterns detected in question: %s", labels)
    return PreparedChat(
        profile=request.profile,
        history=_trim_history(request.messages, settings),
        question=question,
        guard=bool(labels),
        language=request.language,
    )


def _trim_history(messages: Sequence[ChatMessage], settings: Settings) -> list[ChatMessage]:
    """Keep the most recent messages within the message-count and character budgets."""
    cleaned: list[ChatMessage] = []
    for message in messages or []:
        content, _ = neutralise(message.content, max_length=MAX_MESSAGE_CHARS)
        if content:
            cleaned.append(ChatMessage(role=message.role, content=content))

    recent = cleaned[-settings.max_history_messages :]
    kept: list[ChatMessage] = []
    total = 0
    for message in reversed(recent):
        if total + len(message.content) > settings.max_history_chars:
            break
        kept.append(message)
        total += len(message.content)
    kept.reverse()
    return kept


async def stream_answer(prepared: PreparedChat) -> AsyncIterator[str]:
    """Stream the assistant answer, delegating to the configured provider."""
    provider = get_provider()
    async for chunk in provider.stream_chat(
        prepared.profile,
        prepared.history,
        prepared.question,
        prepared.guard,
        prepared.language,
    ):
        yield chunk
