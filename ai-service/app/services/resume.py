"""Resume upload validation, text extraction and profile-draft orchestration.

The uploaded file is never written to disk and never persisted. It is validated in
memory, its text layer is extracted, sanitised and capped, and the clean text is then
handed to the configured provider. Resume text and any personal data it contains are
never logged.
"""

from __future__ import annotations

import io
import logging
from typing import Any

from fastapi import UploadFile
from pypdf import PdfReader

from ..config import RESUME_UNVERIFIED_WARNING, get_settings
from ..providers import get_provider
from ..schemas import ResumeExtractionResponse
from .security import detect_injection, sanitize_text

logger = logging.getLogger(__name__)

PDF_CONTENT_TYPE = "application/pdf"
PDF_MAGIC = b"%PDF-"

#: Draft keys a provider is allowed to return. Anything else is discarded, so neither an
#: over-eager model nor text injected into the document can shape the response.
_ALLOWED_DRAFT_KEYS = frozenset(
    {
        "fullName",
        "headline",
        "summary",
        "location",
        "email",
        "phone",
        "education",
        "skills",
        "currentlyLearning",
        "projects",
        "experience",
        "achievements",
        "certifications",
        "codingProfiles",
        "links",
        "careerInterests",
    }
)


class ResumeRejection(Exception):
    """Raised when an upload cannot be accepted, carrying a clean error envelope."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


async def extract_resume(upload: UploadFile) -> ResumeExtractionResponse:
    """Validate an uploaded PDF and return an unverified candidate-profile draft."""
    settings = get_settings()
    filename = (upload.filename or "").strip()
    content_type = (upload.content_type or "").split(";")[0].strip().lower()

    if content_type != PDF_CONTENT_TYPE or not filename.lower().endswith(".pdf"):
        raise ResumeRejection(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Only PDF resumes are accepted. Upload a file with the application/pdf "
            "content type and a .pdf file name.",
        )

    max_bytes = settings.resume_max_mb * 1024 * 1024
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ResumeRejection(
            413,
            "RESUME_TOO_LARGE",
            f"The resume must be no larger than {settings.resume_max_mb} MB.",
        )
    if not data.startswith(PDF_MAGIC):
        raise ResumeRejection(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "The uploaded file does not look like a PDF (missing the %PDF- signature).",
        )

    raw_text = _extract_text(data)
    text = sanitize_text(raw_text, max_length=settings.resume_max_chars)
    if not text:
        raise ResumeRejection(
            422,
            "NO_TEXT_EXTRACTED",
            "The PDF has no selectable text, so nothing could be extracted. It looks like a "
            "scanned or image-only document; upload a text-based PDF.",
        )

    warnings: list[str] = [RESUME_UNVERIFIED_WARNING]
    if len(raw_text) > settings.resume_max_chars:
        warnings.append(
            f"The document is long; only the first {settings.resume_max_chars} characters were "
            "analysed."
        )
    labels = detect_injection(text)
    if labels:
        warnings.append(
            "The document contained text resembling instructions. It was treated strictly as "
            "data and never followed."
        )
        logger.warning("Prompt-injection patterns detected in an uploaded resume: %s", labels)

    extraction = await get_provider().extract_resume(text)
    warnings.extend(warning for warning in extraction.warnings if warning)

    logger.info(
        "Resume extraction completed: %s character(s) analysed, %s section(s) detected.",
        len(text),
        len(extraction.detected_sections),
    )

    return ResumeExtractionResponse(
        draft=_filter_draft(extraction.draft),
        detected_sections=extraction.detected_sections,
        warnings=warnings,
        source_file_name=filename,
        extracted_characters=len(text),
        verified=False,
    )


def _extract_text(data: bytes) -> str:
    """Extract the text layer from the PDF bytes without touching the filesystem."""
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:  # noqa: BLE001 - pypdf raises many internal error types
        raise ResumeRejection(
            422,
            "PDF_UNREADABLE",
            "The uploaded PDF could not be read. Upload a valid, text-based PDF.",
        ) from exc
    return "\n".join(pages)


def _filter_draft(draft: dict[str, Any]) -> dict[str, Any]:
    """Keep only the profile-shaped keys a draft is allowed to contain."""
    return {key: value for key, value in draft.items() if key in _ALLOWED_DRAFT_KEYS}
