"""Canonical skill-name helpers shared by the job-matching code.

Skill canonicalisation collapses variant spellings ("React.js" and "React",
"Postgres" and "PostgreSQL", "NodeJS" and "Node.js") onto a single identifier before
the profile is matched against a job description, while non-equivalent technologies
(Java vs JavaScript) stay distinct.
"""

from __future__ import annotations

import re

#: Variant spellings mapped to their canonical identifier.
#: Only unambiguous equivalences belong here - closely related but distinct
#: technologies (Java / JavaScript, SQL / NoSQL) must keep separate identifiers.
SKILL_ALIASES: dict[str, str] = {
    "postgres": "postgresql",
    "postgresql db": "postgresql",
    "psql": "postgresql",
    "react.js": "react",
    "reactjs": "react",
    "react js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    "java se": "java",
    "jdk": "java",
    "springboot": "spring boot",
    "spring-boot": "spring boot",
    "k8s": "kubernetes",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "mssql": "sql server",
    "ms sql": "sql server",
    "tailwindcss": "tailwind",
    "tailwind css": "tailwind",
    # Version-suffixed spellings of the same technology. These are unambiguous:
    # "HTML5" is HTML and "CSS3" is CSS, so a job asking for HTML/CSS matches the
    # profile even when the profile spells them with the version number.
    "html5": "html",
    "html 5": "html",
    "css3": "css",
    "css 3": "css",
    "js": "javascript",
    # Acronyms and expanded forms of one concept (still one distinct technology).
    "oop": "object-oriented programming",
    "rest api": "rest",
    "rest apis": "rest",
    "rest api design": "rest",
    "rest api development": "rest",
    "restful": "rest",
    "restful api": "rest",
    "restful apis": "rest",
    "restful web services": "rest",
}

_WHITESPACE = re.compile(r"\s+")


def canonical_skill(name: str) -> str:
    """Return the canonical identifier for a skill name.

    Matching is case-insensitive, whitespace-insensitive and alias-aware, so
    "  React.JS " and "react" produce the same identifier.
    """
    if not name:
        return ""
    # "&" and "and" are treated as the same connector so "Data Structures & Algorithms"
    # and "data structures and algorithms" (a job description's wording) match.
    key = str(name).strip().lower().replace("&", "and")
    key = _WHITESPACE.sub(" ", key)
    return SKILL_ALIASES.get(key, key)


__all__ = ["SKILL_ALIASES", "canonical_skill"]
