"""Job-description matching orchestration."""

from __future__ import annotations

import logging
from typing import Sequence

from ..config import DEFAULT_RUBRIC
from ..providers import get_provider
from ..schemas import CandidateProfile, JobMatchResult, RubricDefinition, RubricItem
from .security import neutralise

logger = logging.getLogger(__name__)

MAX_JOB_DESCRIPTION_CHARS = 20000


def resolve_rubric(
    rubric: Sequence[RubricDefinition] | None,
) -> list[dict] | None:
    """Normalise an operator-supplied rubric into plain dicts.

    Returns ``None`` when no rubric was supplied (or it is empty) so every caller
    falls back to the built-in default. A rubric whose weights do not sum to 100
    is rejected here and replaced by the default, keeping the score auditable.
    """
    if not rubric:
        return None
    resolved = [{"criterion": item.criterion, "weight": item.weight} for item in rubric]
    if sum(item["weight"] for item in resolved) != 100:
        logger.warning("Supplied job-match rubric weights do not sum to 100; using the default.")
        return None
    return resolved


async def analyse(
    profile: CandidateProfile,
    job_description: str,
    rubric: Sequence[RubricDefinition] | None = None,
) -> JobMatchResult:
    """Compare a job description against the verified profile."""
    cleaned, labels = neutralise(job_description, max_length=MAX_JOB_DESCRIPTION_CHARS)
    if labels:
        logger.warning("Prompt-injection patterns detected in job description: %s", labels)

    effective_rubric = resolve_rubric(rubric)
    result = await get_provider().job_match(profile, cleaned, rubric=effective_rubric)
    return _normalise(result, effective_rubric)


def _normalise(result: JobMatchResult, rubric: list[dict] | None = None) -> JobMatchResult:
    """Guarantee the rubric weights sum to 100 and the score stays in range."""
    if sum(item.weight for item in result.rubric) == 100:
        return result

    logger.warning("Provider returned rubric weights that do not sum to 100; normalising.")
    weights = rubric if rubric else DEFAULT_RUBRIC
    normalised: list[RubricItem] = []
    for index, item in enumerate(result.rubric):
        fallback_weight = weights[index]["weight"] if index < len(weights) else 0
        normalised.append(item.model_copy(update={"weight": fallback_weight}))

    if not normalised:
        normalised = [
            RubricItem(
                criterion=entry["criterion"],
                weight=entry["weight"],
                awarded_score=0.0,
                rationale="No rubric was returned by the provider.",
            )
            for entry in weights
        ]

    return result.model_copy(update={"rubric": normalised})
