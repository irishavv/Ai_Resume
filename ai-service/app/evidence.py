"""Profile-evidence helpers used by job matching.

Every helper here answers one question: *does the verified profile actually support
this claim?* They are pure functions over ``CandidateProfile``, so a matched
requirement can be re-verified against the profile before it reaches a user. Nothing in
this module invents evidence: an unresolvable claim is reported as unsupported rather
than filled in.

The module deliberately sits below the providers so it can be imported without a cycle.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .normalise import canonical_skill
from .schemas import CandidateProfile

#: Common technologies used to recognise the requirements stated in a job description.
KNOWN_TECHNOLOGIES: tuple[str, ...] = (
    "java", "spring boot", "spring", "spring security", "hibernate", "jpa", "flyway",
    "react", "react.js", "javascript", "typescript", "node.js", "node", "express", "next.js",
    "python", "fastapi", "flask", "django", "pydantic", "pandas", "numpy",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "sql", "sqlite", "oracle",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "jenkins",
    "git", "github", "gitlab", "ci/cd", "linux", "bash",
    "rest", "graphql", "grpc", "microservices", "kafka", "rabbitmq", "websockets",
    "html", "css", "tailwind", "tailwind css", "sass", "vite", "webpack",
    "junit", "mockito", "mockwebserver", "pytest", "jest", "cypress", "selenium",
    "maven", "gradle", "npm", "agile", "scrum", "jira", "oop", "dsa",
    "machine learning", "deep learning", "llm", "nlp", "gemini", "openai", "groq",
    "sse", "jwt", "oauth", "prometheus", "grafana", "elasticsearch", "rabbitmq",
    "c++", "c#", "php", "kotlin", "go", "rust", "dart", "flutter",
)

#: Terms that are too ambiguous to detect reliably in free text.
AMBIGUOUS_TERMS: frozenset[str] = frozenset({"go", "r", "c", "ai", "ml", "ui", "ux"})


@dataclass(frozen=True)
class EvidenceRef:
    """One piece of profile evidence: where it lives, how to describe it, and its wording."""

    source: str
    label: str
    detail: str

    def __str__(self) -> str:  # keeps string formatting at existing call sites working
        return self.label


# --------------------------------------------------------------------------- #
# Profile evidence index
# --------------------------------------------------------------------------- #


def profile_evidence_index(profile: CandidateProfile) -> dict[str, EvidenceRef]:
    """Map every *verified* technology in the profile to its evidence.

    Keying on the canonical identifier (not the raw spelling) is what stops "React"
    and "React.js" from being treated as two different skills. Only the profile is
    read: a technology the profile never mentions can never appear in the index, so a
    job description or a generated question cannot manufacture evidence.

    ``currentlyLearning`` is intentionally excluded. An entry there is a real profile
    mention but it does not establish the skill, so indexing it would let a
    still-being-learned technology be reported as verified hands-on experience. Callers
    that need the learning entries read ``profile.currently_learning`` directly.
    """
    index: dict[str, EvidenceRef] = {}

    def add(term: str, source: str, label: str) -> None:
        key = canonical_skill(term)
        if key and key not in index:
            index[key] = EvidenceRef(source=source, label=label, detail=term.strip())

    sections = (
        ("languages", profile.skills.languages),
        ("frameworks", profile.skills.frameworks),
        ("databases", profile.skills.databases),
        ("tools", profile.skills.tools),
        ("concepts", profile.skills.concepts),
    )
    for section, terms in sections:
        for term in terms:
            add(term, f"skills.{section}", f"Listed under skills.{section}")
    for project in profile.projects:
        for term in project.technologies:
            add(term, f"projects[{project.name}]", f"Used in project '{project.name}'")
    for entry in profile.experience:
        for term in entry.technologies:
            add(
                term,
                f"experience[{entry.role} at {entry.company}]",
                f"Used during '{entry.role}' at {entry.company}",
            )
    return index


def lookup_evidence(
    index: dict[str, EvidenceRef], term: str
) -> EvidenceRef | None:
    """Find the profile evidence for ``term``, allowing for labels and aliases.

    ``index`` is keyed by the canonical skill identifier, so a job description that
    says "React.js" matches a profile that lists "React". A word-boundary search then
    bridges a single word ("rest") to a multi-word profile label ("rest api design").
    """
    canonical = canonical_skill(term)
    if not canonical:
        return None

    if canonical in index:
        return index[canonical]

    pattern = re.compile(r"(?<![a-z0-9])" + re.escape(canonical) + r"(?![a-z0-9])")
    for key, ref in index.items():
        if pattern.search(key):
            return ref
    return None


__all__ = [
    "AMBIGUOUS_TERMS",
    "EvidenceRef",
    "KNOWN_TECHNOLOGIES",
    "lookup_evidence",
    "profile_evidence_index",
]
