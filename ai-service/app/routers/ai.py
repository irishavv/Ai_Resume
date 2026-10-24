"""AI endpoints: streaming chat and job-description matching."""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..providers import get_provider
from ..providers.base import ProviderError
from ..schemas import ChatRequest, JobMatchRequest, JobMatchResult
from ..services import chat as chat_service
from ..services import job_match as job_match_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

GENERIC_ERROR_MESSAGE = "The assistant could not generate a response. Please try again."
GENERIC_ERROR_CODE = "AI_GENERATION_FAILED"


def _frame(event: str, payload: dict[str, object]) -> str:
    """Encode a single Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """Stream the assistant answer as Server-Sent Events."""
    prepared = chat_service.prepare(request)
    provider = get_provider()

    async def event_stream() -> AsyncIterator[str]:
        collected: list[str] = []
        try:
            async for chunk in chat_service.stream_answer(prepared):
                collected.append(chunk)
                yield _frame("delta", {"text": chunk})
        except ProviderError as exc:
            logger.warning("Chat provider failure (%s): %s", exc.code, exc)
            yield _frame("error", {"code": exc.code, "message": str(exc)})
            return
        except Exception:  # noqa: BLE001 - the client must always receive a clean frame
            logger.exception("Unhandled chat generation failure")
            yield _frame("error", {"code": GENERIC_ERROR_CODE, "message": GENERIC_ERROR_MESSAGE})
            return

        yield _frame(
            "done",
            {
                "content": "".join(collected),
                "provider": provider.name,
                "model": provider.model,
            },
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/job-match", response_model=JobMatchResult)
async def job_match(request: JobMatchRequest) -> JobMatchResult:
    """Compare a job description against the verified candidate profile."""
    return await job_match_service.analyse(request.profile, request.job_description, request.rubric)
