"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

#: Default job-matching rubric. The weights must always sum to 100.
#: Returned with every job-match result so the assessment stays auditable.
DEFAULT_RUBRIC: list[dict] = [
    {"criterion": "Required technical skills", "weight": 35},
    {"criterion": "Relevant project experience", "weight": 25},
    {"criterion": "Education fit", "weight": 15},
    {"criterion": "Preferred / nice-to-have skills", "weight": 15},
    {"criterion": "Demonstrated impact", "weight": 10},
]

#: Disclaimer attached to every suitability score.
SCORE_DISCLAIMER = (
    "This score is an approximate profile-to-job match indicator generated from the "
    "verified candidate profile. It is not a probability of hiring success and should be "
    "combined with an interview and reference checks."
)

#: Mandatory caveat attached to every resume extraction. An uploaded resume is untrusted
#: data until a human reviews the draft and confirms it into the verified profile.
RESUME_UNVERIFIED_WARNING = (
    "This resume extraction is an unverified draft generated automatically from the "
    "uploaded document. A human must review and confirm every field before it becomes part "
    "of the verified candidate profile."
)


class Settings(BaseSettings):
    """Runtime settings for the AI service."""

    model_config = SettingsConfigDict(
        # The project keeps a single .env at the repository root. The first path
        # applies when the service is started from the repository root, the second
        # when it is started from ai-service/ (run-ai.bat). Missing files are ignored.
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    ai_service_port: int = 8000
    ai_provider: str = "mock"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    #: Maximum number of transport attempts for one provider request (1 = no retry).
    #: Kept deliberately small so a failing provider can never create a request loop.
    groq_max_attempts: int = 3
    #: Base delay for the exponential backoff between transport retries, in seconds.
    groq_retry_base_seconds: float = 0.5
    #: Upper bound for any single backoff or ``Retry-After`` wait, in seconds.
    groq_retry_max_seconds: float = 8.0
    #: Maximum number of schema-repair attempts after a reply fails validation.
    groq_max_repair_attempts: int = 1
    #: Explicit completion-token budget for JSON completions. Reasoning models spend part
    #: of this budget on hidden reasoning tokens; without a budget the JSON reply can be
    #: cut off mid-object (``finish_reason=length``), which the provider then rejects as an
    #: invalid request and which used to push every structured reply onto the deterministic
    #: fallback. Set to 0 to omit the field and let the provider choose.
    groq_max_completion_tokens: int = 4096
    #: Reasoning effort for models that support it. "low" keeps hidden reasoning tokens
    #: small so they cannot crowd out the structured JSON reply. Empty omits the field.
    groq_reasoning_effort: str = "low"
    allowed_origins: str = "http://localhost:8080"
    max_history_messages: int = 20
    max_history_chars: int = 12000
    llm_timeout_seconds: int = 120
    resume_max_mb: int = 5
    resume_max_chars: int = 100_000

    @property
    def resolved_provider(self) -> str:
        """Return the provider that can actually serve requests right now."""
        if self.ai_provider == "groq" and not self.groq_api_key:
            return "mock"
        return self.ai_provider

    @property
    def cors_origins(self) -> list[str]:
        """Allowed browser origins parsed from the comma separated setting."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()


def clear_settings_cache() -> None:
    """Drop the cached settings (used by tests when overriding the environment)."""
    get_settings.cache_clear()
