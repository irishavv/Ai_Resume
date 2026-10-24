"""Pydantic v2 models describing the AI service wire format.

The candidate profile is validated here so the model always receives consistent,
well-structured data. All JSON on the wire is camelCase.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model that accepts and emits camelCase keys."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
        str_strip_whitespace=True,
    )


# --------------------------------------------------------------------------- #
# Candidate profile
# --------------------------------------------------------------------------- #


class Education(CamelModel):
    institution: str = ""
    degree: str = ""
    field: str | None = None
    start_year: str | None = None
    graduation_year: str | None = None
    grade: str | None = None
    verified: bool = True


class Skills(CamelModel):
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    concepts: list[str] = Field(default_factory=list)

    def all_terms(self) -> list[str]:
        """Every skill term with the category it came from."""
        return [
            *self.languages,
            *self.frameworks,
            *self.databases,
            *self.tools,
            *self.concepts,
        ]


class Project(CamelModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    repository_url: str | None = None
    live_url: str | None = None
    status: str | None = None
    verified: bool = True


class Experience(CamelModel):
    company: str = ""
    role: str = ""
    type: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    location: str | None = None
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    verified: bool = True


class Certification(CamelModel):
    name: str = ""
    issuer: str | None = None
    year: str | None = None
    url: str | None = None
    verified: bool = True


class CodingProfile(CamelModel):
    platform: str = ""
    handle: str | None = None
    url: str | None = None


class Links(CamelModel):
    github: str | None = None
    linkedin: str | None = None
    portfolio: str | None = None
    leetcode: str | None = None


class CareerInterests(CamelModel):
    preferred_roles: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)
    work_type: str | None = None


class CandidateProfile(CamelModel):
    """The verified candidate profile supplied by the backend on every request."""

    full_name: str = ""
    headline: str = ""
    summary: str = ""
    location: str | None = None
    email: str | None = None
    phone: str | None = None
    sample_data: bool = False
    education: list[Education] = Field(default_factory=list)
    skills: Skills = Field(default_factory=Skills)
    currently_learning: list[str] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    coding_profiles: list[CodingProfile] = Field(default_factory=list)
    links: Links = Field(default_factory=Links)
    career_interests: CareerInterests = Field(default_factory=CareerInterests)


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    profile: CandidateProfile
    messages: list[ChatMessage] = Field(default_factory=list)
    question: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "hi"] = "en"

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("question must not be blank")
        return cleaned


# --------------------------------------------------------------------------- #
# Job matching
# --------------------------------------------------------------------------- #


class RubricDefinition(CamelModel):
    """One scoring criterion supplied by the caller.

    The operator console owns the rubric, so the weights arrive per request. Only
    ``criterion`` and ``weight`` are configurable; the awarded score is always the
    model's own output.
    """

    criterion: str = Field(min_length=1, max_length=120)
    weight: int = Field(ge=0, le=100)


class JobMatchRequest(CamelModel):
    profile: CandidateProfile
    job_description: str = Field(min_length=20, max_length=20000)
    #: Optional operator-configured rubric. When omitted the built-in defaults apply.
    rubric: list[RubricDefinition] | None = None

    @field_validator("job_description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 20:
            raise ValueError("jobDescription must be at least 20 characters")
        return cleaned


class RubricItem(CamelModel):
    """One rubric criterion. ``awardedScore`` is expressed in points out of ``weight``."""

    criterion: str
    weight: int
    awarded_score: float
    rationale: str


class MatchedRequirement(CamelModel):
    requirement: str
    kind: Literal["required", "preferred"]
    evidence: str
    matched: bool


class JobMatchResult(CamelModel):
    suitability_score: int = Field(ge=0, le=100)
    score_label: str
    summary: str
    rubric: list[RubricItem] = Field(default_factory=list)
    matched_requirements: list[MatchedRequirement] = Field(default_factory=list)
    missing_or_unverified: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    areas_to_evaluate: list[str] = Field(default_factory=list)
    suggested_interview_questions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    disclaimer: str


class HealthResponse(CamelModel):
    status: str
    service: str
    provider: str
    model: str
    time: str


# --------------------------------------------------------------------------- #
# Resume extraction
# --------------------------------------------------------------------------- #


class ResumeExtraction(CamelModel):
    """Structure returned by a provider after reading resume text.

    ``draft`` is a partial candidate-profile object (camelCase keys) containing only the
    fields the document actually evidences.
    """

    draft: dict[str, Any] = Field(default_factory=dict)
    detected_sections: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ResumeExtractionResponse(CamelModel):
    """Wire response for ``POST /ai/resume/extract``."""

    draft: dict[str, Any] = Field(default_factory=dict)
    detected_sections: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    source_file_name: str
    extracted_characters: int
    verified: bool = False
