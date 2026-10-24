"""Health and service banner endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from .. import __version__
from ..providers import get_provider
from ..schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe reporting the active provider."""
    provider = get_provider()
    return HealthResponse(
        status="ok",
        service="ai-service",
        provider=provider.name,
        model=provider.model,
        time=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/")
async def banner() -> dict[str, object]:
    """Describe the service and its endpoints."""
    provider = get_provider()
    return {
        "name": "AI Portfolio - AI Service",
        "version": __version__,
        "provider": provider.name,
        "model": provider.model,
        "endpoints": [
            "GET /health",
            "POST /ai/chat/stream",
            "POST /ai/job-match",
            "POST /ai/resume/extract",
        ],
    }
