"""AI Portfolio - AI service entrypoint.

Stateless FastAPI service that owns prompt construction, LLM streaming and
job-description analysis. Only the Spring Boot backend is expected to call it.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .config import get_settings
from .providers import get_provider
from .providers.base import ProviderError
from .routers import ai, health, resume
from .services.resume import ResumeRejection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    provider = get_provider()
    logger.info(
        "AI service starting: provider=%s model=%s (configured=%s)",
        provider.name,
        provider.model,
        settings.ai_provider,
    )
    yield
    logger.info("AI service stopped")


app = FastAPI(
    title="AI Portfolio - AI Service",
    version=__version__,
    description=(
        "Prompt construction, LLM streaming and job-description matching for the "
        "AI Portfolio application."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ai.router)
app.include_router(resume.router)


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    problems = "; ".join(
        f"{'.'.join(str(part) for part in error.get('loc', []))}: {error.get('msg', '')}"
        for error in exc.errors()
    )
    return _error_response(422, "VALIDATION_ERROR", problems or "The request payload is invalid.")


@app.exception_handler(ProviderError)
async def provider_exception_handler(_: Request, exc: ProviderError) -> JSONResponse:
    logger.warning("Provider error surfaced to caller: %s", exc)
    return _error_response(503, exc.code, str(exc))


@app.exception_handler(ResumeRejection)
async def resume_rejection_handler(_: Request, exc: ResumeRejection) -> JSONResponse:
    return _error_response(exc.status_code, exc.code, exc.message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")
