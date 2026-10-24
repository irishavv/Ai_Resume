"""Resume upload endpoint."""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from ..schemas import ResumeExtractionResponse
from ..services import resume as resume_service

router = APIRouter(prefix="/ai/resume", tags=["resume"])


@router.post("/extract", response_model=ResumeExtractionResponse)
async def extract_resume(file: UploadFile = File(...)) -> ResumeExtractionResponse:
    """Extract an unverified candidate-profile draft from an uploaded PDF resume.

    The file is processed in memory only - it is never persisted - and the returned draft
    is always marked unverified for a human to review.
    """
    return await resume_service.extract_resume(file)
