"""Input sanitisation and prompt-injection guards.

All user-supplied content passes through here before it reaches a prompt. Sanitising
protects the model from malformed input; the injection guard keeps user content in the
role of data rather than instructions.
"""

from __future__ import annotations

import re

#: Control characters that must never reach a prompt (newlines and tabs are kept).
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")

#: Runs of three or more newlines are collapsed to one blank line.
_BLANK_LINES = re.compile(r"\n{3,}")

#: Prompt-injection patterns. Labels are safe to log; the matched text is not.
INJECTION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "ignore_previous_instructions",
        re.compile(
            r"ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+"
            r"(instructions|prompts|rules|messages)",
            re.I,
        ),
    ),
    (
        "disregard_instructions",
        re.compile(r"disregard\s+(all\s+)?(previous|prior|above|earlier)?\s*"
                   r"(instructions|prompts|rules)", re.I),
    ),
    ("identity_override", re.compile(r"\byou\s+are\s+now\b", re.I)),
    ("role_override", re.compile(r"\b(act|behave|pretend)\s+(as|like)\s+(a|an|the)\b", re.I)),
    ("system_prompt_probe", re.compile(r"\bsystem\s+(prompt|message|instructions)\b", re.I)),
    (
        "reveal_instructions",
        re.compile(r"\b(reveal|show|repeat|print|output)\s+(me\s+)?(your\s+)?"
                   r"(instructions|prompt|rules|configuration|system)", re.I),
    ),
    ("jailbreak", re.compile(r"\b(jailbreak|dan\s+mode|developer\s+mode|bypass\s+(your\s+)?"
                            r"(rules|filters|guardrails))\b", re.I)),
    (
        "override_rules",
        re.compile(r"\b(new|updated)\s+(instructions|rules)\s*:", re.I),
    ),
)


def sanitize_text(value: str | None, max_length: int = 4000) -> str:
    """Normalise line endings, strip control characters and enforce a length limit."""
    if not value:
        return ""
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL_CHARS.sub("", text)
    text = _BLANK_LINES.sub("\n\n", text)
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    return text


def detect_injection(text: str) -> list[str]:
    """Return the labels of every prompt-injection pattern found in ``text``."""
    if not text:
        return []
    return [label for label, pattern in INJECTION_PATTERNS if pattern.search(text)]


def neutralise(text: str | None, max_length: int = 4000) -> tuple[str, list[str]]:
    """Sanitise ``text`` and report detected injection attempts.

    The content itself is preserved - it is still legitimate data to reason about -
    but the caller is told to harden the system prompt for this request.
    """
    cleaned = sanitize_text(text, max_length=max_length)
    return cleaned, detect_injection(cleaned)
