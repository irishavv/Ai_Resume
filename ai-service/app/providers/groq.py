"""Groq provider - the real LLM integration used in production.

Enabled by setting ``AI_PROVIDER=groq`` and ``GROQ_API_KEY``. The API key is read from
the environment on the server only and is never logged or returned to a caller.

Failure handling is deliberately explicit and bounded:

* transient transport failures (timeout, network, 5xx, 429) are retried a small,
  configurable number of times, honouring the provider's ``Retry-After`` header and
  otherwise using exponential backoff with jitter;
* permanent failures (bad credentials, invalid request) are never retried;
* a reply that does not match the required schema is repaired at most once, and if it
  still fails the deterministic provider is substituted.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, AsyncIterator, Sequence

import httpx

from ..config import Settings
from ..prompts import (
    build_job_match_retry_prompt,
    build_job_match_system_prompt,
    build_job_match_user_prompt,
    build_resume_extraction_system_prompt,
    build_resume_extraction_user_prompt,
    build_system_prompt,
)
from ..schemas import (
    CandidateProfile,
    ChatMessage,
    JobMatchResult,
    ResumeExtraction,
)
from .base import LLMProvider, ProviderError

logger = logging.getLogger(__name__)

#: Indirection so tests can observe or stub the wait between retries.
_sleep = asyncio.sleep

#: Status codes worth retrying: the provider is temporarily unable to serve us.
_RETRYABLE_STATUS_CODES = frozenset({408, 409, 425, 429, 500, 502, 503, 504})

#: Status codes that will never succeed on a retry: the request itself is wrong.
_AUTH_STATUS_CODES = frozenset({401, 403})
_INVALID_STATUS_CODES = frozenset({400, 404, 405, 413, 422})

_SCHEMA_FAILURE_MESSAGE = (
    "The AI provider returned a response that did not match the required schema."
)

#: Provider error codes that mean "the reply was not valid JSON" rather than "the request
#: was malformed". Groq reports HTTP 400 with ``json_validate_failed`` when the model's
#: output was cut off before the JSON object closed (for example because the completion
#: budget was consumed by hidden reasoning tokens). Resending the identical payload cannot
#: help, but rebuilding the prompt can, so this is reported as a *validation* failure and
#: routed to the bounded repair round instead of being retried at the transport level or
#: treated as a permanent bad request.
_RETRYABLE_PROVIDER_CODES = frozenset({"json_validate_failed", "context_length_exceeded"})


def _provider_error_code(response: httpx.Response) -> str | None:
    """The provider's own short error code (for example ``rate_limit_exceeded``).

    Only this machine-readable label is read. The provider's free-text message is never
    read, logged or returned, so nothing from the upstream body - request content,
    account details or credentials - can reach a caller.
    """
    try:
        body = response.json()
    except ValueError:
        return None
    if not isinstance(body, dict):
        return None
    error = body.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        if isinstance(code, str) and code.strip():
            return code.strip()
        kind = error.get("type")
        if isinstance(kind, str) and kind.strip():
            return kind.strip()
        return None
    if isinstance(error, str) and error.strip():
        return error.strip()
    return None


def _classify_status(
    status_code: int, provider_code: str | None = None
) -> tuple[str, str, bool]:
    """Return ``(code, message, retryable)`` for a non-success HTTP status."""
    if status_code == 429:
        return (
            "AI_RATE_LIMITED",
            "The AI provider is rate limiting requests. Please try again shortly.",
            True,
        )
    if status_code in _AUTH_STATUS_CODES:
        return (
            "AI_AUTH_ERROR",
            "The AI provider rejected the configured credentials.",
            False,
        )
    if status_code in _INVALID_STATUS_CODES:
        if provider_code in _RETRYABLE_PROVIDER_CODES:
            # A rejected *reply* is not a rejected request: the prompt can be repaired.
            return ("AI_VALIDATION_FAILED", _SCHEMA_FAILURE_MESSAGE, False)
        return (
            "AI_INVALID_REQUEST",
            "The AI provider rejected the request as invalid.",
            False,
        )
    if status_code >= 500 or status_code in _RETRYABLE_STATUS_CODES:
        return (
            "AI_PROVIDER_UNAVAILABLE",
            "The AI provider is temporarily unavailable.",
            True,
        )
    return (
        "AI_PROVIDER_ERROR",
        f"The AI provider returned HTTP {status_code}.",
        False,
    )


def _retry_after_seconds(response: httpx.Response) -> float | None:
    """Parse a ``Retry-After`` header (delay-seconds or HTTP-date), if present."""
    raw = response.headers.get("retry-after")
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None
    if value.isdigit():
        return float(value)
    try:
        moment = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if moment is None:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    delta = (moment - datetime.now(timezone.utc)).total_seconds()
    return max(0.0, delta)


class GroqProvider(LLMProvider):
    """Streams completions from the Groq OpenAI-compatible API."""

    name = "groq"

    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.settings = settings
        self.model = settings.groq_model
        self._endpoint = settings.groq_base_url.rstrip("/") + "/chat/completions"
        #: Optional transport injection, used by the test suite to avoid live calls.
        self._transport = transport

    # ------------------------------------------------------------------ #
    # Chat
    # ------------------------------------------------------------------ #

    async def stream_chat(
        self,
        profile: CandidateProfile,
        messages: Sequence[ChatMessage],
        question: str,
        guard: bool = False,
        language: str = "en",
    ) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "stream": True,
            "temperature": 0.3,
            "messages": self._chat_messages(profile, messages, question, guard, language),
        }
        timeout = httpx.Timeout(self.settings.llm_timeout_seconds, connect=10.0)
        try:
            async with httpx.AsyncClient(
                timeout=timeout, transport=self._transport
            ) as client:
                async with client.stream(
                    "POST", self._endpoint, headers=self._headers(), json=payload
                ) as response:
                    if response.status_code >= 400:
                        code, message, _ = _classify_status(response.status_code)
                        logger.warning(
                            "Groq streaming request failed: status=%s code=%s",
                            response.status_code,
                            code,
                        )
                        raise ProviderError(
                            message, status_code=response.status_code, code=code
                        )
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        content = (choices[0].get("delta") or {}).get("content")
                        if content:
                            yield content
        except ProviderError:
            raise
        except httpx.TimeoutException as exc:
            raise ProviderError("The AI provider timed out.", code="AI_TIMEOUT") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("The AI provider could not be reached.") from exc

    def _chat_messages(
        self,
        profile: CandidateProfile,
        messages: Sequence[ChatMessage],
        question: str,
        guard: bool,
        language: str,
    ) -> list[dict[str, str]]:
        payload = [
            {
                "role": "system",
                "content": build_system_prompt(profile, guard=guard, language=language),
            }
        ]
        payload.extend({"role": message.role, "content": message.content} for message in messages)
        payload.append({"role": "user", "content": question})
        return payload

    # ------------------------------------------------------------------ #
    # Job matching
    # ------------------------------------------------------------------ #

    async def job_match(
        self,
        profile: CandidateProfile,
        job_description: str,
        rubric: list[dict] | None = None,
    ) -> JobMatchResult:
        system = {"role": "system", "content": build_job_match_system_prompt(profile, rubric=rubric)}
        user = {"role": "user", "content": build_job_match_user_prompt(job_description)}

        for attempt in range(self._repair_budget + 1):
            try:
                raw = await self._request_json([system, user])
                return JobMatchResult.model_validate(json.loads(raw))
            except ValueError as exc:
                logger.warning(
                    "Groq job-match reply failed validation on attempt %s: %s", attempt + 1, exc
                )
                if attempt < self._repair_budget:
                    user = {
                        "role": "user",
                        "content": build_job_match_retry_prompt(job_description),
                    }
            except ProviderError as exc:
                logger.warning(
                    "Groq job-match request failed (%s); using deterministic scoring instead.", exc
                )
                break

        return await self._deterministic_fallback().job_match(profile, job_description, rubric=rubric)

    # ------------------------------------------------------------------ #
    # Resume extraction
    # ------------------------------------------------------------------ #

    async def extract_resume(self, text: str) -> ResumeExtraction:
        system = {"role": "system", "content": build_resume_extraction_system_prompt()}
        user = {"role": "user", "content": build_resume_extraction_user_prompt(text)}

        for attempt in range(self._repair_budget + 1):
            try:
                raw = await self._request_json([system, user])
                payload = json.loads(raw)
                if not isinstance(payload, dict):
                    raise ValueError("the reply was not a JSON object")
                return ResumeExtraction(draft=payload)
            except ValueError as exc:
                # Never log the reply or its contents: it is derived from resume data.
                logger.warning(
                    "Groq resume-extraction reply failed validation on attempt %s (%s).",
                    attempt + 1,
                    type(exc).__name__,
                )
            except ProviderError as exc:
                logger.warning(
                    "Groq resume-extraction request failed (%s); using deterministic "
                    "extraction instead.",
                    exc,
                )
                break

        return await self._deterministic_fallback().extract_resume(text)

    # ------------------------------------------------------------------ #
    # Transport
    # ------------------------------------------------------------------ #

    @property
    def _repair_budget(self) -> int:
        """Number of extra schema-repair rounds allowed after a failed validation."""
        return max(0, int(self.settings.groq_max_repair_attempts))

    @property
    def _max_attempts(self) -> int:
        """Maximum transport attempts for a single request."""
        return max(1, int(self.settings.groq_max_attempts))

    def _backoff_delay(self, attempt: int) -> float:
        """Bounded exponential backoff with jitter for transport attempt ``attempt``."""
        base = max(0.0, float(self.settings.groq_retry_base_seconds))
        ceiling = max(0.0, float(self.settings.groq_retry_max_seconds))
        if base == 0.0 or ceiling == 0.0:
            return 0.0
        exponential = base * (2 ** (attempt - 1))
        jittered = exponential * random.uniform(0.5, 1.5)
        return min(jittered, ceiling)

    def _wait_for(self, response: httpx.Response, attempt: int) -> float:
        """Server-requested delay when present, otherwise bounded backoff."""
        requested = _retry_after_seconds(response)
        if requested is None:
            return self._backoff_delay(attempt)
        return min(requested, max(0.0, float(self.settings.groq_retry_max_seconds)))

    async def _post(self, payload: dict[str, Any]) -> httpx.Response:
        timeout = httpx.Timeout(self.settings.llm_timeout_seconds, connect=10.0)
        try:
            async with httpx.AsyncClient(
                timeout=timeout, transport=self._transport
            ) as client:
                return await client.post(self._endpoint, headers=self._headers(), json=payload)
        except httpx.TimeoutException as exc:
            raise ProviderError(
                "The AI provider timed out.", code="AI_TIMEOUT", retryable=True
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderError(
                "The AI provider could not be reached.",
                code="AI_PROVIDER_UNREACHABLE",
                retryable=True,
            ) from exc

    async def _request_json(self, messages: list[dict[str, str]]) -> str:
        """POST one JSON completion, retrying transient failures a bounded number of times."""
        payload: dict[str, object] = {
            "model": self.model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": messages,
        }
        # Reasoning models spend part of the completion budget on hidden reasoning tokens.
        # Without an explicit budget the provider's default can be consumed before the JSON
        # object closes, producing ``finish_reason=length`` and a reply the provider then
        # rejects as invalid JSON. A larger budget plus a low reasoning effort keeps the
        # structured reply intact.
        budget = int(self.settings.groq_max_completion_tokens or 0)
        if budget > 0:
            payload["max_completion_tokens"] = budget
        effort = (self.settings.groq_reasoning_effort or "").strip()
        if effort:
            payload["reasoning_effort"] = effort

        attempt = 0
        while attempt < self._max_attempts:
            attempt += 1
            try:
                response = await self._post(payload)
            except ProviderError as exc:
                if not exc.retryable or attempt >= self._max_attempts:
                    raise
                await _sleep(self._backoff_delay(attempt))
                continue

            if response.status_code < 400:
                return self._extract_content(response)

            provider_code = _provider_error_code(response)
            code, message, retryable = _classify_status(response.status_code, provider_code)
            logger.warning(
                "Groq request failed: status=%s code=%s provider_code=%s attempt=%s/%s",
                response.status_code,
                code,
                provider_code,
                attempt,
                self._max_attempts,
            )
            if not retryable or attempt >= self._max_attempts:
                raise ProviderError(
                    message,
                    status_code=response.status_code,
                    code=code,
                    retryable=retryable,
                    provider_code=provider_code,
                )
            await _sleep(self._wait_for(response, attempt))

        raise ProviderError("The AI provider is temporarily unavailable.")

    @staticmethod
    def _extract_content(response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError as exc:
            raise ProviderError(
                "The AI provider returned a malformed response.", code="AI_INVALID_RESPONSE"
            ) from exc

        choices = body.get("choices") or []
        if not choices:
            raise ProviderError(
                "The AI provider returned an empty response.", code="AI_EMPTY_RESPONSE"
            )
        content = (choices[0].get("message") or {}).get("content")
        if not isinstance(content, str) or not content.strip():
            raise ProviderError(
                "The AI provider returned an empty response.", code="AI_EMPTY_RESPONSE"
            )
        return content

    def _deterministic_fallback(self) -> LLMProvider:
        from .mock import MockProvider

        return MockProvider(self.settings)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.settings.groq_api_key}",
            "Content-Type": "application/json",
        }
