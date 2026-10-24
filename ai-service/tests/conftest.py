"""Shared pytest fixtures.

Every test runs against the deterministic mock provider, so the suite never touches
the network and never needs an API key.
"""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("AI_PROVIDER", "mock")
os.environ.setdefault("GROQ_API_KEY", "")

from app.config import clear_settings_cache  # noqa: E402
from app.main import app  # noqa: E402
from app.providers import clear_provider_cache  # noqa: E402
from app.providers.mock import MockProvider  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(autouse=True)
def mock_environment(monkeypatch):
    """Force the offline provider and remove the streaming delay."""
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setattr(MockProvider, "chunk_delay", 0.0)
    clear_settings_cache()
    clear_provider_cache()
    yield
    clear_settings_cache()
    clear_provider_cache()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def profile_dict() -> dict:
    """A small, fully valid candidate profile used across the tests."""
    return {
        "fullName": "Test Candidate",
        "headline": "Backend Developer | Java, Spring Boot, FastAPI",
        "summary": "Backend-focused developer who builds REST services.",
        "location": "Pune, India",
        "email": "test.candidate@example.com",
        "education": [
            {
                "institution": "Test University",
                "degree": "B.E.",
                "field": "Computer Engineering",
                "startYear": "2022",
                "graduationYear": "2026",
                "grade": "CGPA 8.0 / 10",
            }
        ],
        "skills": {
            "languages": ["Java", "Python"],
            "frameworks": ["Spring Boot", "FastAPI"],
            "databases": ["PostgreSQL"],
            "tools": ["Git", "Docker"],
            "concepts": ["REST API design"],
        },
        "currentlyLearning": ["Kubernetes"],
        "projects": [
            {
                "name": "TaskFlow",
                "description": "A multi-user task manager.",
                "technologies": ["Java", "Spring Boot", "PostgreSQL"],
                "highlights": ["Reduced task-list latency by 70% through JPA fetch joins."],
                "repositoryUrl": "https://example.com/taskflow",
                "status": "Completed",
            }
        ],
        "experience": [],
        "achievements": ["Finalist in a university hackathon."],
        "certifications": [],
        "codingProfiles": [],
        "links": {"github": "https://github.com/test-candidate"},
        "careerInterests": {
            "preferredRoles": ["Backend Developer"],
            "preferredLocations": ["Pune"],
            "workType": "Full-time",
        },
    }
