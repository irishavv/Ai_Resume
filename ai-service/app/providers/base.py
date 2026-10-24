"""Provider abstraction shared by the mock and Groq implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator, Sequence

from ..schemas import (
    CandidateProfile,
    ChatMessage,
    JobMatchResult,
    ResumeExtraction,
)


class ProviderError(RuntimeError):
    """Raised when an LLM provider cannot fulfil a request.

    The message is always safe to surface to a caller: it never contains
    credentials or raw upstream payloads. ``retryable`` distinguishes a transient
    failure (a timeout or a rate limit) from a permanent one (bad credentials or a
    malformed request) so callers never retry into an error they cannot fix.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str = "AI_PROVIDER_UNAVAILABLE",
        retryable: bool = False,
        provider_code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.retryable = retryable
        #: The provider's own short error code (for example ``rate_limit_exceeded`` or
        #: ``json_validate_failed``). Safe to surface: it is a machine-readable label,
        #: never the provider's free-text message or any part of the request.
        self.provider_code = provider_code


class LLMProvider(ABC):
    """Contract implemented by every LLM provider."""

    name: str = "base"
    model: str = "unknown"

    @abstractmethod
    def stream_chat(
        self,
        profile: CandidateProfile,
        messages: Sequence[ChatMessage],
        question: str,
        guard: bool = False,
        language: str = "en",
    ) -> AsyncIterator[str]:
        """Stream the assistant answer for ``question`` as text chunks.

        ``guard`` asks the provider to harden its system prompt because the request
        content matched one or more prompt-injection patterns. ``language`` is the
        two-letter language code ("en" or "hi") the answer must be produced in.
        """

    @abstractmethod
    async def job_match(
        self,
        profile: CandidateProfile,
        job_description: str,
        rubric: list[dict] | None = None,
    ) -> JobMatchResult:
        """Return a structured profile-to-job match assessment.

        ``rubric`` is the operator-configured scoring rubric (``criterion`` and
        ``weight`` per entry). When it is ``None`` the provider falls back to its
        built-in default rubric.
        """

    @abstractmethod
    async def extract_resume(self, text: str) -> ResumeExtraction:
        """Extract a partial candidate-profile draft from resume text.

        The text is untrusted data. Only information explicitly present in the document
        may be returned, and the result is always an unverified draft.
        """
