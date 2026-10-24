"""Deterministic offline provider.

This provider needs no network access and no API key. It answers from the verified
candidate profile using explicit, auditable rules - it never invents facts, it refuses
to confirm unverified claims, and it plainly reports information that is unavailable.

It exists so the whole application can be developed, demonstrated and tested offline.
Switching ``AI_PROVIDER`` to ``groq`` swaps in the real LLM with no other code change.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, AsyncIterator, Iterable, Sequence

from ..config import DEFAULT_RUBRIC, SCORE_DISCLAIMER, Settings
from ..evidence import (
    AMBIGUOUS_TERMS as _AMBIGUOUS_TERMS,
    KNOWN_TECHNOLOGIES as COMMON_SKILLS,
    EvidenceRef,
    lookup_evidence as _lookup_evidence,
    profile_evidence_index,
)
from ..schemas import (
    CandidateProfile,
    ChatMessage,
    JobMatchResult,
    MatchedRequirement,
    ResumeExtraction,
    RubricItem,
)
from .base import LLMProvider

#: Entities a recruiter might wrongly assert. Used only to refuse unverified claims.
_ASSERTED_ENTITIES: tuple[str, ...] = (
    "google", "amazon", "microsoft", "meta", "facebook", "apple", "netflix", "adobe",
    "oracle", "salesforce", "uber", "flipkart", "paypal", "infosys", "tcs", "wipro",
    "accenture", "cognizant", "deloitte", "capgemini", "cognizant", "nvidia", "ibm",
    "iit", "nit", "stanford", "mit", "phd", "doctorate",
    "senior engineer", "senior developer", "lead engineer", "tech lead", "team lead",
    "engineering manager", "architect", "cto", "vp of engineering",
)

_CONFIRM_PATTERN = re.compile(
    r"\b(right|correct|isn'?t (it|that|he|she)|wasn'?t (he|she)|didn'?t (he|she)"
    r"|confirm|true that|agree)\b",
    re.I,
)

_DIFFICULTY_PATTERN = re.compile(
    r"\b(hardest|most (difficult|challenging|complex)|toughest|challeng\w*)\b", re.I
)

_REFERENTIAL_PATTERN = re.compile(
    r"\b(which one|that one|this one|the first|the second|the third|those|them|it|that)\b",
    re.I
)

_REQUIRED_HEADING = re.compile(
    r"\b(required|requirements|must[- ]have|essential|minimum qualifications|mandatory|"
    r"what you.?ll need|who you are)\b",
    re.I,
)
_PREFERRED_HEADING = re.compile(
    r"\b(preferred|nice[- ]to[- ]have|good[- ]to[- ]have|plus|bonus|desirable|"
    r"added advantage|nice to have)\b",
    re.I,
)
_DEGREE_PATTERN = re.compile(
    r"\b(degree|bachelor|b\.?tech|b\.?e\b|b\.?sc|master|m\.?tech|computer science|"
    r"engineering|graduat)\w*",
    re.I,
)

#: "Why should we hire this candidate?" and close variants. Checked before the generic
#: keyword buckets so it is not swallowed by the fit/hire bucket. The Hindi alternatives
#: let a recruiter ask the same question in Hindi.
_HIRE_PATTERN = re.compile(
    r"(why\s+(should|would|can|do)\s+(we|i|you|they)\s+(hire|consider|shortlist|select|pick)"
    r"|why\s+hire\b"
    r"|\bhire\s+(this|the|him|her)\s+candidate\b"
    r"|\bwhy\s+(are|is|should)\s+(you|he|she|they|candidate)\b[^?]*\b(good|right|strong)\s+fit\b"
    r"|क्यों\s*हायर|हायर\s*क्यों|क्यों\s*भर्ती|भर्ती\s*क्यों|उम्मीदवार\s*को\s*क्यों)",
    re.I,
)


def _t(language: str, english: str, hindi: str) -> str:
    """Return the Hindi wording when the answer language is Hindi, else the English one.

    Only the mock's own connective text and headings are translated here; the profile
    data interpolated into these strings (skills, project names, URLs, institutions and
    tech stacks) is always passed through verbatim.
    """
    return hindi if language == "hi" else english


def _normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _bullets(items: Iterable[str], limit: int | None = None) -> str:
    values = [item for item in items if item]
    if limit is not None:
        values = values[:limit]
    return "\n".join(f"- {item}" for item in values)


class MockProvider(LLMProvider):
    """Rule-based provider used when no LLM credentials are available."""

    name = "mock"
    model = "mock-deterministic-v1"

    #: Delay between streamed chunks, so the UI shows a real progressive response.
    chunk_delay = 0.02

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings

    # ------------------------------------------------------------------ #
    # Chat
    # ------------------------------------------------------------------ #

    async def stream_chat(
        self,
        profile: CandidateProfile,
        messages: Sequence[ChatMessage],
        question: str,
        guard: bool = False,
        language: str = "en",
    ) -> AsyncIterator[str]:
        # The mock is rule-based, so ``guard`` needs no prompt hardening: it can never be
        # talked out of its rules because it never follows instructions from input.
        answer = self._compose_answer(profile, messages, question, language)
        for chunk in self._chunk(answer):
            yield chunk
            if self.chunk_delay:
                await asyncio.sleep(self.chunk_delay)

    def _chunk(self, text: str) -> Iterable[str]:
        """Split text into word-sized chunks, preserving whitespace."""
        buffer = ""
        for part in re.split(r"(\s+)", text):
            if not part:
                continue
            buffer += part
            if part.strip():
                yield buffer
                buffer = ""
        if buffer:
            yield buffer

    # ------------------------------------------------------------------ #
    # Answer composition
    # ------------------------------------------------------------------ #

    def _compose_answer(
        self,
        profile: CandidateProfile,
        messages: Sequence[ChatMessage],
        question: str,
        language: str = "en",
    ) -> str:
        q = question.lower()
        words = set(re.findall(r"[a-z+#.]+", q))

        if self._is_unverified_claim(profile, question):
            return self._unverified_claim_response(profile, language)

        # Checked before every generic bucket so "why should we hire ..." is never
        # swallowed by the fit/hire bucket below.
        if _HIRE_PATTERN.search(q):
            return self._hire_response(profile, language)

        if ("project" in q or "built" in q or "developed" in q) and _DIFFICULTY_PATTERN.search(q):
            return self._project_difficulty_response(profile, messages, language)

        project = self._referenced_project(profile, q, messages)
        if project is not None and (
            "project" in q or "challenge" in q or "difficult" in q or "about" in q or _REFERENTIAL_PATTERN.search(q)
        ):
            return self._project_detail_response(profile, project, question, language)

        if words & {"project", "projects", "portfolio", "build", "built", "developed", "work"}:
            return self._projects_response(profile, language)

        if words & {"skill", "skills", "technology", "technologies", "tech", "stack",
                    "language", "languages", "know", "knows", "familiar", "expertise"}:
            return self._skills_response(profile, language)

        if words & {"education", "college", "university", "cgpa", "gpa", "degree",
                    "graduation", "graduate", "academic", "qualification", "qualifications",
                    "studied", "study"}:
            return self._education_response(profile, language)

        if words & {"experience", "internship", "intern", "company", "worked", "working",
                    "job", "employment", "professional"}:
            return self._experience_response(profile, language)

        if words & {"achievement", "achievements", "award", "awards", "certification",
                    "certifications", "certificate", "accomplishment", "accomplishments"}:
            return self._achievements_response(profile, language)

        if words & {"github", "repository", "repositories", "repo", "link", "links",
                    "linkedin", "portfolio", "url", "leetcode", "profile"}:
            return self._links_response(profile, language)

        if words & {"role", "roles", "location", "locations", "relocate", "looking",
                    "interest", "interests", "career", "opportunity", "opportunities"}:
            return self._career_response(profile, language)

        if words & {"suitable", "suitability", "fit", "hire", "hiring", "recommend",
                    "shortlist", "interview"}:
            return self._fit_response(profile, language)

        if words & {"hi", "hello", "hey", "greetings"} and len(words) <= 4:
            return self._greeting_response(profile, language)

        if words & {"about", "introduce", "introduction", "summary", "background", "who",
                    "tell", "yourself", "candidate"}:
            return self._intro_response(profile, language)

        return self._fallback_response(profile, language)

    # ------------------------------------------------------------------ #
    # Answers
    # ------------------------------------------------------------------ #

    def _greeting_response(self, profile: CandidateProfile, language: str = "en") -> str:
        return _t(
            language,
            f"Hello. I'm the AI representative of **{profile.full_name}** - {profile.headline}. "
            "I can talk you through their education, technical skills, projects and "
            "achievements, all strictly from their verified profile. What would you like to "
            "know first?",
            f"नमस्ते। मैं **{profile.full_name}** का AI प्रतिनिधि हूँ - {profile.headline}। "
            "मैं आपको उनकी शिक्षा, तकनीकी कौशल, प्रोजेक्ट्स और उपलब्धियों के बारे में बता "
            "सकता हूँ, वह भी पूरी तरह उनकी सत्यापित प्रोफ़ाइल से। आप सबसे पहले क्या जानना "
            "चाहेंगे?",
        )

    def _intro_response(self, profile: CandidateProfile, language: str = "en") -> str:
        parts = [f"**{profile.full_name}** - {profile.headline}"]
        if profile.location:
            parts.append(
                _t(language, f"Based in {profile.location}.", f"स्थित: {profile.location}।")
            )
        if profile.summary:
            parts.append(profile.summary)
        if profile.education:
            latest = profile.education[0]
            detail = " ".join(
                item
                for item in [
                    latest.degree,
                    latest.field,
                    _t(language, f"at {latest.institution}", f"{latest.institution} में"),
                ]
                if item
            )
            year = latest.graduation_year or _t(
                language, "the expected graduation year", "अपेक्षित स्नातक वर्ष"
            )
            parts.append(
                _t(
                    language,
                    f"Education: {detail} (graduating {year}).",
                    f"शिक्षा: {detail} ({year} में स्नातक)।",
                )
            )
        if profile.skills.languages:
            parts.append(
                _t(
                    language,
                    "Core languages: " + ", ".join(profile.skills.languages) + ".",
                    "मुख्य भाषाएँ: " + ", ".join(profile.skills.languages) + "।",
                )
            )
        if profile.projects:
            names = ", ".join(project.name for project in profile.projects[:3])
            parts.append(
                _t(
                    language,
                    f"Has built {len(profile.projects)} documented project(s), including "
                    f"{names}.",
                    f"उन्होंने {len(profile.projects)} प्रलेखित प्रोजेक्ट बनाए हैं, जिनमें "
                    f"{names} शामिल हैं।",
                )
            )
        return "\n\n".join(parts)

    def _skills_response(self, profile: CandidateProfile, language: str = "en") -> str:
        skills = profile.skills
        blocks = [
            _t(
                language,
                f"Here are the skills documented in **{profile.full_name}**'s verified profile.",
                f"ये कौशल **{profile.full_name}** की सत्यापित प्रोफ़ाइल में दर्ज हैं।",
            )
        ]
        if skills.languages:
            blocks.append(
                _t(language, "**Programming languages**", "**प्रोग्रामिंग भाषाएँ**")
                + "\n"
                + _bullets(skills.languages)
            )
        if skills.frameworks:
            blocks.append(
                _t(language, "**Frameworks and libraries**", "**फ़्रेमवर्क और लाइब्रेरी**")
                + "\n"
                + _bullets(skills.frameworks)
            )
        if skills.databases:
            blocks.append(
                _t(language, "**Databases**", "**डेटाबेस**") + "\n" + _bullets(skills.databases)
            )
        if skills.tools:
            blocks.append(_t(language, "**Tools**", "**टूल्स**") + "\n" + _bullets(skills.tools))
        if skills.concepts:
            blocks.append(
                _t(language, "**Concepts**", "**संकल्पनाएँ**") + "\n" + _bullets(skills.concepts)
            )
        if profile.currently_learning:
            heading = _t(
                language,
                "**Currently learning** (not yet demonstrated at a professional level)",
                "**अभी सीख रहे हैं** (पेशेवर स्तर पर अभी प्रदर्शित नहीं)",
            )
            blocks.append(heading + "\n" + _bullets(profile.currently_learning))
        if len(blocks) == 1:
            return self._missing(language, "skills")
        return "\n\n".join(blocks)

    def _projects_response(self, profile: CandidateProfile, language: str = "en") -> str:
        if not profile.projects:
            return self._missing(language, "projects")
        blocks = [
            _t(
                language,
                f"**{profile.full_name}** has {len(profile.projects)} documented project(s):",
                f"**{profile.full_name}** के {len(profile.projects)} प्रलेखित प्रोजेक्ट हैं:",
            )
        ]
        for project in profile.projects:
            tech = (
                ", ".join(project.technologies)
                if project.technologies
                else _t(language, "technologies not listed", "प्रौद्योगिकियाँ दर्ज नहीं हैं")
            )
            line = [f"**{project.name}** - {project.description}"]
            line.append(_t(language, f"Stack: {tech}.", f"स्टैक: {tech}।"))
            if project.status:
                line.append(_t(language, f"Status: {project.status}.", f"स्थिति: {project.status}।"))
            if project.repository_url:
                line.append(_t(language, f"Repository: {project.repository_url}", f"रिपॉज़िटरी: {project.repository_url}"))
            if project.live_url:
                line.append(_t(language, f"Live: {project.live_url}", f"लाइव: {project.live_url}"))
            blocks.append("\n".join(line))
        blocks.append(
            _t(
                language,
                "Ask me about any specific project for a deeper technical breakdown.",
                "किसी विशिष्ट प्रोजेक्ट के गहरे तकनीकी विवरण के लिए मुझसे पूछें।",
            )
        )
        return "\n\n".join(blocks)

    def _project_detail_response(
        self, profile: CandidateProfile, project: Project, question: str, language: str = "en"
    ) -> str:
        blocks = [f"### {project.name}", project.description]
        if project.technologies:
            blocks.append(
                _t(language, "**Technology stack**", "**प्रौद्योगिकी स्टैक**")
                + "\n"
                + _bullets(project.technologies)
            )
        if project.highlights:
            blocks.append(
                _t(
                    language,
                    "**Highlights from the verified profile**",
                    "**सत्यापित प्रोफ़ाइल से मुख्य बिंदु**",
                )
                + "\n"
                + _bullets(project.highlights)
            )
        else:
            blocks.append(
                _t(
                    language,
                    "The verified profile does not list detailed highlights for this project, so I "
                    "cannot describe specific technical challenges it required.",
                    "सत्यापित प्रोफ़ाइल में इस प्रोजेक्ट के विस्तृत मुख्य बिंदु दर्ज नहीं हैं, "
                    "इसलिए मैं इसकी विशिष्ट तकनीकी चुनौतियों का वर्णन नहीं कर सकता।",
                )
            )
        if project.status:
            blocks.append(
                _t(language, f"**Status:** {project.status}", f"**स्थिति:** {project.status}")
            )
        links = [
            _t(language, f"Repository: {project.repository_url}", f"रिपॉज़िटरी: {project.repository_url}")
            if project.repository_url
            else "",
            _t(language, f"Live demo: {project.live_url}", f"लाइव डेमो: {project.live_url}")
            if project.live_url
            else "",
        ]
        link_text = "\n".join(item for item in links if item)
        if link_text:
            blocks.append(link_text)
        if _DIFFICULTY_PATTERN.search(question) and not project.highlights:
            blocks.append(
                _t(
                    language,
                    "I can't confirm how challenging this project was relative to the others - the "
                    "profile does not rank project difficulty.",
                    "मैं पुष्टि नहीं कर सकता कि यह प्रोजेक्ट अन्य की तुलना में कितना चुनौतीपूर्ण "
                    "था - प्रोफ़ाइल प्रोजेक्ट की कठिनाई को क्रम नहीं देती।",
                )
            )
        return "\n\n".join(blocks)

    def _project_difficulty_response(
        self, profile: CandidateProfile, messages: Sequence[ChatMessage], language: str = "en"
    ) -> str:
        if not profile.projects:
            return self._missing(language, "projects")
        named = self._referenced_project(profile, "", messages)
        lines = [
            _t(
                language,
                "The verified profile does not rank the projects by difficulty, so I won't claim "
                "which one was the hardest. What I can do is share the documented challenges from "
                "each project:",
                "सत्यापित प्रोफ़ाइल प्रोजेक्ट्स को कठिनाई के अनुसार क्रम नहीं देती, इसलिए मैं "
                "यह दावा नहीं करूँगा कि कौन-सा सबसे कठिन था। मैं प्रत्येक प्रोजेक्ट की दर्ज "
                "चुनौतियाँ साझा कर सकता हूँ:",
            )
        ]
        for project in profile.projects:
            if project.highlights:
                lines.append(f"**{project.name}**\n" + _bullets(project.highlights))
            else:
                lines.append(
                    _t(
                        language,
                        f"**{project.name}** - no specific challenges recorded in the profile.",
                        f"**{project.name}** - प्रोफ़ाइल में कोई विशिष्ट चुनौती दर्ज नहीं है।",
                    )
                )
        if named is not None:
            lines.append(
                _t(
                    language,
                    f"You were asking about **{named.name}** specifically.",
                    f"आप विशेष रूप से **{named.name}** के बारे में पूछ रहे थे।",
                )
            )
        return "\n\n".join(lines)

    def _education_response(self, profile: CandidateProfile, language: str = "en") -> str:
        if not profile.education:
            return self._missing(language, "education")
        blocks = [
            _t(
                language,
                f"**Education of {profile.full_name}**",
                f"**{profile.full_name} की शिक्षा**",
            )
        ]
        for entry in profile.education:
            detail = " ".join(
                item
                for item in [
                    entry.degree,
                    entry.field,
                    _t(language, f"at {entry.institution}", f"{entry.institution} में"),
                ]
                if item
            )
            if entry.start_year or entry.graduation_year:
                present = _t(language, "present", "वर्तमान")
                detail += f" ({entry.start_year or '?'} - {entry.graduation_year or present})"
            bullet = f"- {detail}"
            if entry.grade:
                bullet += _t(language, f". {entry.grade}", f"। {entry.grade}")
            blocks.append(bullet)
        return "\n".join(blocks)

    def _experience_response(self, profile: CandidateProfile, language: str = "en") -> str:
        if not profile.experience:
            return _t(
                language,
                f"The verified profile does not list any professional experience for "
                f"**{profile.full_name}**. I won't claim experience that has not been confirmed. "
                "What is documented is their education, projects, skills and achievements - "
                "happy to walk you through any of those.",
                f"सत्यापित प्रोफ़ाइल में **{profile.full_name}** का कोई पेशेवर अनुभव दर्ज नहीं "
                "है। मैं ऐसा अनुभव होने का दावा नहीं करूँगा जो पुष्ट न हुआ हो। जो दर्ज है वह "
                "उनकी शिक्षा, प्रोजेक्ट्स, कौशल और उपलब्धियाँ हैं - इनमें से किसी पर भी मैं "
                "आपकी मदद कर सकता हूँ।",
            )
        blocks = []
        for entry in profile.experience:
            role_type = entry.type or _t(language, "role", "भूमिका")
            title = _t(
                language,
                f"{entry.role} at {entry.company}".strip(),
                f"{entry.company} में {entry.role}".strip(),
            )
            line = [f"**{title}** ({role_type})"]
            period = " - ".join(item for item in [entry.start_date, entry.end_date] if item)
            if period:
                line.append(period)
            if entry.location:
                line.append(entry.location)
            if entry.description:
                line.append(entry.description)
            if entry.technologies:
                line.append(
                    _t(
                        language,
                        "Technologies: " + ", ".join(entry.technologies) + ".",
                        "प्रौद्योगिकियाँ: " + ", ".join(entry.technologies) + "।",
                    )
                )
            blocks.append("\n".join(line))
        header = _t(
            language,
            f"**{profile.full_name}** has the following documented experience. Entries marked "
            "as internships are internships, not full-time positions:",
            f"**{profile.full_name}** के पास निम्नलिखित दर्ज अनुभव है। इंटर्नशिप के रूप में "
            "चिह्नित प्रविष्टियाँ इंटर्नशिप हैं, पूर्णकालिक पद नहीं:",
        )
        return header + "\n\n" + "\n\n".join(blocks)

    def _achievements_response(self, profile: CandidateProfile, language: str = "en") -> str:
        blocks = []
        if profile.achievements:
            blocks.append(
                _t(language, "**Achievements**", "**उपलब्धियाँ**")
                + "\n"
                + _bullets(profile.achievements)
            )
        if profile.certifications:
            certs = [
                " - ".join(item for item in [cert.name, cert.issuer, cert.year] if item)
                for cert in profile.certifications
            ]
            blocks.append(_t(language, "**Certifications**", "**प्रमाणपत्र**") + "\n" + _bullets(certs))
        if not blocks:
            return self._missing(language, "achievements")
        return "\n\n".join(blocks)

    def _links_response(self, profile: CandidateProfile, language: str = "en") -> str:
        lines = []
        if profile.links.github:
            lines.append(f"- GitHub: {profile.links.github}")
        if profile.links.linkedin:
            lines.append(f"- LinkedIn: {profile.links.linkedin}")
        if profile.links.portfolio:
            lines.append(f"- Portfolio: {profile.links.portfolio}")
        if profile.links.leetcode:
            lines.append(f"- LeetCode: {profile.links.leetcode}")
        for item in profile.coding_profiles:
            if item.url:
                lines.append(f"- {item.platform}: {item.url}")
        repositories = [
            f"- {project.name}: {project.repository_url}"
            for project in profile.projects
            if project.repository_url
        ]
        blocks = []
        if lines:
            blocks.append(
                _t(language, "**Profile links**", "**प्रोफ़ाइल लिंक**") + "\n" + "\n".join(lines)
            )
        if repositories:
            blocks.append(
                _t(language, "**Project repositories**", "**प्रोजेक्ट रिपॉज़िटरी**")
                + "\n"
                + "\n".join(repositories)
            )
        if not blocks:
            return self._missing(language, "links")
        return "\n\n".join(blocks)

    def _career_response(self, profile: CandidateProfile, language: str = "en") -> str:
        interests = profile.career_interests
        lines = []
        if interests.preferred_roles:
            lines.append(
                _t(language, "**Preferred roles**", "**पसंदीदा भूमिकाएँ**")
                + "\n"
                + _bullets(interests.preferred_roles)
            )
        if interests.preferred_locations:
            lines.append(
                _t(language, "**Preferred locations**", "**पसंदीदा स्थान**")
                + "\n"
                + _bullets(interests.preferred_locations)
            )
        if interests.work_type:
            lines.append(
                _t(language, f"**Work type:** {interests.work_type}", f"**कार्य प्रकार:** {interests.work_type}")
            )
        if profile.location:
            lines.append(
                _t(language, f"**Current location:** {profile.location}", f"**वर्तमान स्थान:** {profile.location}")
            )
        if not lines:
            return self._missing(language, "career")
        intro = _t(
            language,
            f"Here is what the verified profile states about **{profile.full_name}**'s career "
            "interests:\n\n",
            f"सत्यापित प्रोफ़ाइल **{profile.full_name}** की करियर रुचियों के बारे में यह "
            "बताती है:\n\n",
        )
        return intro + "\n\n".join(lines)

    def _fit_response(self, profile: CandidateProfile, language: str = "en") -> str:
        matched: list[str] = []
        if profile.skills.languages:
            matched.append(
                _t(language, "Languages: ", "भाषाएँ: ") + ", ".join(profile.skills.languages)
            )
        if profile.skills.frameworks:
            matched.append(
                _t(language, "Frameworks: ", "फ़्रेमवर्क: ") + ", ".join(profile.skills.frameworks)
            )
        if profile.skills.databases:
            matched.append(
                _t(language, "Databases: ", "डेटाबेस: ") + ", ".join(profile.skills.databases)
            )
        lines = [
            _t(
                language,
                "This is my assessment based on the verified profile, not a hiring decision.",
                "यह सत्यापित प्रोफ़ाइल पर आधारित मेरा मूल्यांकन है, कोई भर्ती निर्णय नहीं।",
            ),
            _bullets(matched),
        ]
        if profile.projects:
            names = ", ".join(project.name for project in profile.projects)
            lines.append(
                _t(
                    language,
                    f"**Evidence from delivery:** {len(profile.projects)} documented project(s) - "
                    f"{names}.",
                    f"**कार्य-आधारित प्रमाण:** {len(profile.projects)} प्रलेखित प्रोजेक्ट - "
                    f"{names}।",
                )
            )
        if profile.experience:
            entries = "; ".join(
                _t(language, f"{entry.role} at {entry.company}", f"{entry.company} में {entry.role}")
                for entry in profile.experience
            )
            lines.append(
                _t(
                    language,
                    f"**Documented experience:** {entries}.",
                    f"**दर्ज अनुभव:** {entries}।",
                )
            )
        else:
            lines.append(
                _t(
                    language,
                    "**Documented experience:** none listed in the verified profile. I cannot claim "
                    "professional experience that has not been confirmed.",
                    "**दर्ज अनुभव:** सत्यापित प्रोफ़ाइल में कोई दर्ज नहीं है। मैं ऐसा पेशेवर "
                    "अनुभव होने का दावा नहीं कर सकता जो पुष्ट न हुआ हो।",
                )
            )
        lines.append(
            _t(
                language,
                "For a role-specific assessment, paste the job description into the job-match panel "
                "and I will compare each requirement against the profile.",
                "किसी विशिष्ट भूमिका के मूल्यांकन के लिए, जॉब-मैच पैनल में नौकरी का विवरण पेस्ट "
                "करें और मैं प्रत्येक आवश्यकता की तुलना प्रोफ़ाइल से करूँगा।",
            )
        )
        return "\n\n".join(lines)

    def _hire_response(self, profile: CandidateProfile, language: str = "en") -> str:
        """Evidence-based hiring summary built only from what the profile documents."""
        blocks: list[str] = [
            _t(
                language,
                "This is my assessment of the evidence recorded in the verified profile. It is a "
                "suitability summary, not a hiring decision.",
                "यह सत्यापित प्रोफ़ाइल में दर्ज प्रमाणों पर आधारित मेरा मूल्यांकन है। यह एक "
                "उपयुक्तता सारांश है, कोई भर्ती निर्णय नहीं।",
            )
        ]

        skills = profile.skills
        skill_lines: list[str] = []
        if skills.languages:
            skill_lines.append(
                _t(language, "Languages: ", "भाषाएँ: ") + ", ".join(skills.languages)
            )
        if skills.frameworks:
            skill_lines.append(
                _t(language, "Frameworks and libraries: ", "फ़्रेमवर्क और लाइब्रेरी: ")
                + ", ".join(skills.frameworks)
            )
        if skills.databases:
            skill_lines.append(
                _t(language, "Databases: ", "डेटाबेस: ") + ", ".join(skills.databases)
            )
        if skills.tools:
            skill_lines.append(_t(language, "Tools: ", "टूल्स: ") + ", ".join(skills.tools))
        if skills.concepts:
            skill_lines.append(
                _t(language, "Concepts: ", "संकल्पनाएँ: ") + ", ".join(skills.concepts)
            )
        heading_skills = _t(language, "### Demonstrating skills", "### प्रदर्शित कौशल")
        if skill_lines:
            blocks.append(heading_skills + "\n" + _bullets(skill_lines))
        else:
            blocks.append(
                heading_skills
                + "\n"
                + _t(
                    language,
                    "The verified profile does not list any skills yet.",
                    "सत्यापित प्रोफ़ाइल में अभी कोई कौशल दर्ज नहीं है।",
                )
            )

        heading_projects = _t(
            language, "### Projects with documented outcomes", "### दर्ज परिणामों वाले प्रोजेक्ट"
        )
        projects_with_highlights = [project for project in profile.projects if project.highlights]
        project_blocks: list[str] = []
        for project in projects_with_highlights:
            detail = f"**{project.name}**"
            if project.technologies:
                detail += " (" + ", ".join(project.technologies) + ")"
            project_blocks.append(detail + "\n" + _bullets(project.highlights))
        if project_blocks:
            blocks.append(heading_projects + "\n" + "\n\n".join(project_blocks))
        else:
            blocks.append(
                heading_projects
                + "\n"
                + _t(
                    language,
                    "No project in the verified profile records concrete, documented outcomes.",
                    "सत्यापित प्रोफ़ाइल में किसी प्रोजेक्ट के ठोस, दर्ज परिणाम नहीं हैं।",
                )
            )

        heading_achievements = _t(
            language, "### Achievements and education", "### उपलब्धियाँ और शिक्षा"
        )
        achievement_blocks: list[str] = []
        if profile.achievements:
            achievement_blocks.append(_bullets(profile.achievements))
        if profile.education:
            education_lines = []
            for entry in profile.education:
                detail = " ".join(
                    item
                    for item in [
                        entry.degree,
                        entry.field,
                        _t(language, f"at {entry.institution}", f"{entry.institution} में"),
                    ]
                    if item
                )
                if entry.graduation_year:
                    detail += f" ({entry.graduation_year})"
                education_lines.append(f"- {detail}")
            achievement_blocks.append("\n".join(education_lines))
        if achievement_blocks:
            blocks.append(heading_achievements + "\n" + "\n\n".join(achievement_blocks))
        else:
            blocks.append(
                heading_achievements
                + "\n"
                + _t(
                    language,
                    "The verified profile does not record achievements or formal education.",
                    "सत्यापित प्रोफ़ाइल में उपलब्धियाँ या औपचारिक शिक्षा दर्ज नहीं है।",
                )
            )

        heading_experience = _t(language, "### Professional experience", "### पेशेवर अनुभव")
        if profile.experience:
            entries = "; ".join(
                _t(language, f"{entry.role} at {entry.company}", f"{entry.company} में {entry.role}")
                for entry in profile.experience
            )
            blocks.append(heading_experience + "\n- " + entries)
        else:
            blocks.append(
                heading_experience
                + "\n"
                + _t(
                    language,
                    "The verified profile records no professional experience, so I will not claim "
                    "any. The case for this candidate rests on the documented skills, projects, "
                    "achievements and education above.",
                    "सत्यापित प्रोफ़ाइल में कोई पेशेवर अनुभव दर्ज नहीं है, इसलिए मैं किसी अनुभव "
                    "का दावा नहीं करूँगा। इस उम्मीदवार का आधार ऊपर दर्ज कौशल, प्रोजेक्ट्स, "
                    "उपलब्धियाँ और शिक्षा हैं।",
                )
            )

        blocks.append(
            _t(
                language,
                "For a role-specific comparison, paste the job description into the job-match panel: "
                "it scores each requirement against this same verified profile.",
                "किसी विशिष्ट भूमिका की तुलना के लिए, जॉब-मैच पैनल में नौकरी का विवरण पेस्ट करें: "
                "यह प्रत्येक आवश्यकता को इसी सत्यापित प्रोफ़ाइल के विरुद्ध आँकता है।",
            )
        )
        return "\n\n".join(blocks)

    def _unverified_claim_response(self, profile: CandidateProfile, language: str = "en") -> str:
        return _t(
            language,
            "I can't confirm that. The verified profile for "
            f"**{profile.full_name}** contains no such information, and I won't confirm claims "
            "about education, employers, seniority, certifications or experience that aren't in "
            "the record.\n\nIf you'd like, ask me about what *is* documented - their "
            "education, skills, projects, achievements and career interests.",
            "मैं इसकी पुष्टि नहीं कर सकता। **{name}** की सत्यापित प्रोफ़ाइल में ऐसी कोई जानकारी "
            "नहीं है, और मैं शिक्षा, नियोक्ताओं, वरिष्ठता, प्रमाणपत्रों या अनुभव के ऐसे दावों "
            "की पुष्टि नहीं करूँगा जो रिकॉर्ड में नहीं हैं।\n\nयदि चाहें तो मुझसे वह पूछें जो "
            "*दर्ज* है - उनकी शिक्षा, कौशल, प्रोजेक्ट्स, उपलब्धियाँ और करियर रुचियाँ।",
        ).format(name=profile.full_name)

    #: Localised subjects used by :meth:`_missing`.
    _MISSING_SUBJECTS: dict[str, tuple[str, str]] = {
        "skills": ("a list of skills", "कौशल की सूची"),
        "projects": ("project details", "प्रोजेक्ट विवरण"),
        "education": ("education details", "शिक्षा विवरण"),
        "achievements": ("achievements or certifications", "उपलब्धियाँ या प्रमाणपत्र"),
        "links": ("profile or repository links", "प्रोफ़ाइल या रिपॉज़िटरी लिंक"),
        "career": ("career interests", "करियर रुचियाँ"),
    }

    def _missing(self, language: str, key: str) -> str:
        subject = _t(language, *self._MISSING_SUBJECTS[key])
        return _t(
            language,
            f"I don't have that information in the verified profile - there is no {subject} "
            "recorded. I'd rather flag it as unavailable than guess.\n\n"
            "I can help with: technical skills, projects and their stacks, education, "
            "documented experience, achievements and certifications, and profile links.",
            f"मेरे पास सत्यापित प्रोफ़ाइल में यह जानकारी नहीं है - कोई {subject} दर्ज नहीं है। "
            "मैं अनुमान लगाने के बजाय इसे अनुपलब्ध बताना पसंद करता हूँ।\n\n"
            "मैं इन विषयों में मदद कर सकता हूँ: तकनीकी कौशल, प्रोजेक्ट्स और उनके स्टैक, शिक्षा, "
            "दर्ज अनुभव, उपलब्धियाँ और प्रमाणपत्र, और प्रोफ़ाइल लिंक।",
        )

    def _fallback_response(self, profile: CandidateProfile, language: str = "en") -> str:
        return _t(
            language,
            "I don't have that information in the verified profile, so I won't speculate. "
            "I can only speak to what has been confirmed.\n\n**I can tell you about:**\n"
            "- Technical skills and the technologies used in each project\n"
            "- Projects, their stacks and documented challenges\n"
            "- Education and academic record\n"
            "- Documented experience and internships\n"
            "- Achievements, certifications and profile links\n"
            "- Career interests and preferred roles",
            "मेरे पास सत्यापित प्रोफ़ाइल में यह जानकारी नहीं है, इसलिए मैं अनुमान नहीं लगाऊँगा। "
            "मैं केवल उसी के बारे में बता सकता हूँ जो पुष्ट है।\n\n"
            "**मैं आपको इनके बारे में बता सकता हूँ:**\n"
            "- तकनीकी कौशल और प्रत्येक प्रोजेक्ट में प्रयुक्त प्रौद्योगिकियाँ\n"
            "- प्रोजेक्ट्स, उनके स्टैक और दर्ज चुनौतियाँ\n"
            "- शिक्षा और शैक्षणिक रिकॉर्ड\n"
            "- दर्ज अनुभव और इंटर्नशिप\n"
            "- उपलब्धियाँ, प्रमाणपत्र और प्रोफ़ाइल लिंक\n"
            "- करियर रुचियाँ और पसंदीदा भूमिकाएँ",
        )

    # ------------------------------------------------------------------ #
    # Referent resolution (conversation memory)
    # ------------------------------------------------------------------ #

    def _referenced_project(
        self,
        profile: CandidateProfile,
        question_lower: str,
        messages: Sequence[ChatMessage],
    ) -> Project | None:
        """Resolve a project mentioned by name, or referenced via the previous answer."""
        for project in profile.projects:
            if _normalise(project.name) and _normalise(project.name) in _normalise(question_lower):
                return project

        # Fall back to the most distinctive word of the project name.
        for project in profile.projects:
            distinctive = sorted(
                (token for token in re.findall(r"[a-z0-9]+", project.name.lower()) if len(token) >= 4),
                key=len,
                reverse=True,
            )
            if distinctive and re.search(
                rf"(?<![a-z0-9]){re.escape(distinctive[0])}(?![a-z0-9])", question_lower
            ):
                return project

        if not _REFERENTIAL_PATTERN.search(question_lower):
            return None
        previous = self._last_assistant_message(messages)
        if not previous:
            return None
        for project in profile.projects:
            if project.name.lower() in previous.lower():
                return project
        return None

    @staticmethod
    def _last_assistant_message(messages: Sequence[ChatMessage]) -> str:
        for message in reversed(list(messages)):
            if message.role == "assistant":
                return message.content
        return ""

    # ------------------------------------------------------------------ #
    # Unverified-claim guard
    # ------------------------------------------------------------------ #

    def _is_unverified_claim(self, profile: CandidateProfile, question: str) -> bool:
        lower = question.lower()
        blob = _normalise(
            " ".join(
                [
                    profile.full_name,
                    profile.headline,
                    profile.summary or "",
                    profile.location or "",
                    " ".join(profile.skills.all_terms()),
                    " ".join(entry.institution for entry in profile.education),
                    " ".join(entry.company for entry in profile.experience),
                    " ".join(entry.role for entry in profile.experience),
                    " ".join(project.name for project in profile.projects),
                    " ".join(cert.name for cert in profile.certifications),
                ]
            )
        )
        asserted = [entity for entity in _ASSERTED_ENTITIES if entity in lower]
        if not asserted:
            years = re.search(r"\b(\d{1,2})\+?\s*years?\s*(of\s*)?(experience|working)", lower)
            if years:
                return True
            return False
        unknown = [entity for entity in asserted if _normalise(entity) not in blob]
        if not unknown:
            return False
        # Only treat it as a claim to refuse when it is phrased as an assertion/confirmation.
        return True if _CONFIRM_PATTERN.search(question) or "at " in lower or "worked" in lower else bool(unknown and _CONFIRM_PATTERN.search(question))

    # ------------------------------------------------------------------ #
    # Deterministic job matching
    # ------------------------------------------------------------------ #

    async def job_match(
        self,
        profile: CandidateProfile,
        job_description: str,
        rubric: list[dict] | None = None,
    ) -> JobMatchResult:
        index = self._technology_index(profile)
        vocabulary = sorted(set(index) | {term for term in COMMON_SKILLS}, key=len, reverse=True)
        required_lines, preferred_lines = self._split_job_description(job_description)

        requirements: list[tuple[str, str, bool, str]] = []
        seen: set[tuple[str, str]] = set()
        for kind, lines in (("required", required_lines), ("preferred", preferred_lines)):
            for term in self._extract_terms(lines, vocabulary):
                key = (term, kind)
                if key in seen:
                    continue
                seen.add(key)
                evidence_ref = _lookup_evidence(index, term)
                requirements.append(
                    (
                        term,
                        kind,
                        evidence_ref is not None,
                        evidence_ref.label
                        if evidence_ref
                        else "Not evidenced in the verified profile.",
                    )
                )

        required = [item for item in requirements if item[1] == "required"]
        preferred = [item for item in requirements if item[1] == "preferred"]
        matched_required = [item for item in required if item[2]]
        matched_preferred = [item for item in preferred if item[2]]

        project_terms = {
            _normalise(term)
            for project in profile.projects
            for term in project.technologies
        } | {_normalise(term) for entry in profile.experience for term in entry.technologies}
        matched_in_delivery = [
            item for item in matched_required if _normalise(item[0]) in project_terms
        ]

        # Each signal is a normalised 0..1 ratio plus its rationale. The scoring
        # rubric itself is supplied by the operator console; the signals only
        # decide how much of each criterion's weight is awarded.
        signals: list[tuple[float, str]] = []

        if required:
            signals.append((
                len(matched_required) / len(required),
                f"{len(matched_required)} of {len(required)} required technologies were "
                "found in the verified profile.",
            ))
        else:
            signals.append((
                0.6,
                "No recognised required technologies could be extracted from the job "
                "description, so this criterion is only partially credited.",
            ))

        if matched_required:
            signals.append((
                len(matched_in_delivery) / len(matched_required),
                f"{len(matched_in_delivery)} of {len(matched_required)} matched required "
                "technologies also appear in documented projects or work history.",
            ))
        elif required:
            signals.append((
                0.0,
                "None of the required technologies were matched, so no delivery evidence is "
                "available yet.",
            ))
        else:
            signals.append((
                0.6,
                "No comparable requirements were identified in the job description.",
            ))

        jd_wants_degree = bool(_DEGREE_PATTERN.search(job_description))
        has_education = bool(profile.education)
        if has_education and jd_wants_degree:
            signals.append((1.0, "The role expects a degree and the profile confirms one."))
        elif has_education:
            signals.append((
                0.8,
                "The profile documents education, but the job description does not state an "
                "explicit education requirement.",
            ))
        elif jd_wants_degree:
            signals.append((
                0.33,
                "The role expects a degree but the verified profile lists no education entry.",
            ))
        else:
            signals.append((0.53, "Education is not specified in either direction."))

        if preferred:
            signals.append((
                len(matched_preferred) / len(preferred),
                f"{len(matched_preferred)} of {len(preferred)} preferred technologies were "
                "found in the verified profile.",
            ))
        else:
            signals.append((
                1.0,
                "No preferred skills were listed, so this criterion is fully credited.",
            ))

        projects_with_highlights = sum(1 for project in profile.projects if project.highlights)
        impact_ratio = min(
            1.0, (3 + 2 * projects_with_highlights + min(3, len(profile.achievements))) / 10.0
        )
        signals.append((
            impact_ratio,
            f"{projects_with_highlights} project(s) document measurable outcomes and "
            f"{len(profile.achievements)} achievement(s) are recorded.",
        ))

        definitions = rubric if rubric else DEFAULT_RUBRIC
        rubric_items: list[RubricItem] = []
        for position, definition in enumerate(definitions):
            weight = int(definition["weight"])
            ratio, rationale = (
                signals[position]
                if position < len(signals)
                else (0.0, "No scoring signal is available for this criterion.")
            )
            rubric_items.append(
                RubricItem(
                    criterion=definition["criterion"],
                    weight=weight,
                    awarded_score=round(weight * ratio, 2),
                    rationale=rationale,
                )
            )
        rubric = rubric_items

        score = int(round(sum(item.awarded_score for item in rubric)))
        score = max(0, min(100, score))

        matched_requirements = [
            MatchedRequirement(
                requirement=term,
                kind=kind,  # type: ignore[arg-type]
                evidence=evidence,
                matched=matched,
            )
            for term, kind, matched, evidence in requirements
        ]

        missing = [
            f"{term} - not evidenced in the verified profile"
            for term, _kind, matched, _evidence in requirements
            if not matched
        ]

        strengths: list[str] = []
        if matched_required:
            strengths.append(
                "Demonstrated required technologies: "
                + ", ".join(item[0] for item in matched_required[:8])
                + "."
            )
        if matched_in_delivery:
            strengths.append(
                "Those requirements are backed by delivered work: "
                + ", ".join(item[0] for item in matched_in_delivery[:6])
                + "."
            )
        if projects_with_highlights:
            strengths.append(
                f"{projects_with_highlights} project(s) document concrete engineering outcomes "
                "rather than feature lists."
            )
        if has_education:
            strengths.append("Education requirement is documented in the profile.")
        if not strengths:
            strengths.append(
                "The verified profile does not yet evidence the requirements in this job "
                "description; this is a gap in the record, not proof the candidate lacks them."
            )

        areas_to_evaluate = [
            f"Probe practical depth in {term} during the interview - it is not evidenced in the profile."
            for term, _kind, matched, _evidence in requirements
            if not matched
        ][:6]
        if not areas_to_evaluate:
            areas_to_evaluate = [
                "Validate the depth of the matched technologies with a live technical exercise.",
                "Confirm how recent the hands-on experience with the matched stack is.",
            ]

        questions: list[str] = []
        for term, _kind, matched, _evidence in requirements:
            if not matched:
                questions.append(
                    f"You have not recorded experience with {term}. How would you get productive "
                    "with it in the first month, and what similar technology have you used?"
                )
            if len(questions) >= 5:
                break
        questions.extend(
            [
                "Walk me through the architecture of the project you are most proud of, and the "
                "trade-offs you made.",
                "Describe a production issue you diagnosed and how you found the root cause.",
                "How do you decide between adding a new dependency and writing the code yourself?",
                "What was the hardest bug you fixed, and what did it teach you?",
            ]
        )
        questions = questions[:8]

        limitations = [
            "Assessment is based solely on the verified profile; no live code review, "
            "take-home exercise or interview signals were used.",
            "Absence of a technology in the profile means it is unverified, not that the "
            "candidate cannot use it.",
        ]
        if not preferred:
            limitations.append(
                "The job description did not separate preferred requirements, so all extracted "
                "requirements were treated as required."
            )

        matched_ratio = (
            f"{len(matched_required)}/{len(required)} required technologies matched"
            if required
            else "no explicit required technologies extracted"
        )
        label = self._score_label(score)
        summary = (
            f"Approximate profile-to-job match: {score}/100 ({label.lower()}). "
            f"{matched_ratio}, with {len(matched_in_delivery)} backed by documented project or "
            "work experience."
        )

        return JobMatchResult(
            suitability_score=score,
            score_label=label,
            summary=summary,
            rubric=rubric,
            matched_requirements=matched_requirements,
            missing_or_unverified=missing,
            strengths=strengths,
            areas_to_evaluate=areas_to_evaluate,
            suggested_interview_questions=questions,
            limitations=limitations,
            disclaimer=SCORE_DISCLAIMER,
        )

    @staticmethod
    def _score_label(score: int) -> str:
        if score >= 85:
            return "Very strong match"
        if score >= 70:
            return "Strong match"
        if score >= 55:
            return "Moderate match"
        if score >= 40:
            return "Partial match"
        return "Limited overlap"

    @staticmethod
    def _technology_index(profile: CandidateProfile) -> dict[str, EvidenceRef]:
        """Map every canonical technology in the profile to its evidence.

        Shared with job matching so a matched requirement and its evidence are verified
        against exactly the same view of the profile.
        """
        return profile_evidence_index(profile)

    @staticmethod
    def _split_job_description(job_description: str) -> tuple[list[str], list[str]]:
        """Split a job description into required and preferred requirement lines."""
        required: list[str] = []
        preferred: list[str] = []
        mode = "required"
        saw_preferred_heading = False

        for raw_line in job_description.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if len(line) < 120 and _PREFERRED_HEADING.search(line):
                mode = "preferred"
                saw_preferred_heading = True
                continue
            if len(line) < 120 and _REQUIRED_HEADING.search(line):
                mode = "required"
                continue
            (preferred if mode == "preferred" else required).append(line)

        if not saw_preferred_heading:
            return required, []
        return required, preferred

    @staticmethod
    def _extract_terms(lines: Sequence[str], vocabulary: Sequence[str]) -> list[str]:
        """Return the technologies mentioned in ``lines``, in order of first appearance."""
        text = "\n".join(lines).lower()
        found: list[tuple[int, str]] = []
        for term in vocabulary:
            if term in _AMBIGUOUS_TERMS:
                continue
            pattern = re.compile(
                r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])"
            )
            match = pattern.search(text)
            if match:
                found.append((match.start(), term))
        found.sort(key=lambda item: item[0])
        return [term for _position, term in found]

    # ------------------------------------------------------------------ #
    # Resume extraction (deterministic, offline)
    # ------------------------------------------------------------------ #

    async def extract_resume(self, text: str) -> ResumeExtraction:
        """Extract a partial profile draft from resume text using fixed heuristics.

        The text is treated purely as data. Only information that appears literally in
        the document is returned; the result is always an unverified draft.
        """
        return _build_resume_extraction(text)


# --------------------------------------------------------------------------- #
# Deterministic resume heuristics (module-level so the class stays readable)
# --------------------------------------------------------------------------- #

#: Recognised technologies mapped to their display name and skill category.
_RESUME_SKILLS: dict[str, tuple[str, str]] = {
    "java": ("Java", "languages"),
    "javascript": ("JavaScript", "languages"),
    "typescript": ("TypeScript", "languages"),
    "python": ("Python", "languages"),
    "sql": ("SQL", "languages"),
    "kotlin": ("Kotlin", "languages"),
    "c++": ("C++", "languages"),
    "c#": ("C#", "languages"),
    "php": ("PHP", "languages"),
    "rust": ("Rust", "languages"),
    "dart": ("Dart", "languages"),
    "html": ("HTML", "languages"),
    "css": ("CSS", "languages"),
    "bash": ("Bash", "languages"),
    "spring boot": ("Spring Boot", "frameworks"),
    "spring security": ("Spring Security", "frameworks"),
    "spring": ("Spring", "frameworks"),
    "hibernate": ("Hibernate", "frameworks"),
    "jpa": ("JPA", "frameworks"),
    "react": ("React", "frameworks"),
    "next.js": ("Next.js", "frameworks"),
    "node.js": ("Node.js", "frameworks"),
    "node": ("Node", "frameworks"),
    "express": ("Express", "frameworks"),
    "fastapi": ("FastAPI", "frameworks"),
    "flask": ("Flask", "frameworks"),
    "django": ("Django", "frameworks"),
    "tailwind css": ("Tailwind CSS", "frameworks"),
    "tailwind": ("Tailwind", "frameworks"),
    "flutter": ("Flutter", "frameworks"),
    "postgresql": ("PostgreSQL", "databases"),
    "mysql": ("MySQL", "databases"),
    "mongodb": ("MongoDB", "databases"),
    "redis": ("Redis", "databases"),
    "sqlite": ("SQLite", "databases"),
    "oracle": ("Oracle", "databases"),
    "docker": ("Docker", "tools"),
    "kubernetes": ("Kubernetes", "tools"),
    "aws": ("AWS", "tools"),
    "gcp": ("GCP", "tools"),
    "azure": ("Azure", "tools"),
    "terraform": ("Terraform", "tools"),
    "jenkins": ("Jenkins", "tools"),
    "git": ("Git", "tools"),
    "github": ("GitHub", "tools"),
    "gitlab": ("GitLab", "tools"),
    "maven": ("Maven", "tools"),
    "gradle": ("Gradle", "tools"),
    "npm": ("npm", "tools"),
    "jira": ("Jira", "tools"),
    "junit": ("JUnit", "tools"),
    "mockito": ("Mockito", "tools"),
    "pytest": ("pytest", "tools"),
    "jest": ("Jest", "tools"),
    "selenium": ("Selenium", "tools"),
    "flyway": ("Flyway", "tools"),
    "prometheus": ("Prometheus", "tools"),
    "grafana": ("Grafana", "tools"),
    "elasticsearch": ("Elasticsearch", "tools"),
    "rest api": ("REST API", "concepts"),
    "graphql": ("GraphQL", "concepts"),
    "grpc": ("gRPC", "concepts"),
    "microservices": ("Microservices", "concepts"),
    "kafka": ("Kafka", "concepts"),
    "rabbitmq": ("RabbitMQ", "concepts"),
    "websockets": ("WebSockets", "concepts"),
    "agile": ("Agile", "concepts"),
    "scrum": ("Scrum", "concepts"),
    "oop": ("Object-Oriented Programming", "concepts"),
    "dsa": ("Data Structures & Algorithms", "concepts"),
    "machine learning": ("Machine Learning", "concepts"),
    "deep learning": ("Deep Learning", "concepts"),
    "llm": ("LLM", "concepts"),
    "nlp": ("NLP", "concepts"),
    "sse": ("Server-Sent Events", "concepts"),
    "jwt": ("JWT", "concepts"),
    "oauth": ("OAuth", "concepts"),
}

#: Ordered skill categories, matching the ``Skills`` schema layout.
_SKILL_CATEGORY_ORDER: tuple[str, ...] = ("languages", "frameworks", "databases", "tools", "concepts")

#: Section headings recognised in a resume, mapped to the canonical section key.
_SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "summary": (
        "summary", "professional summary", "profile summary", "career summary",
        "objective", "career objective", "about me", "about",
    ),
    "education": (
        "education", "education details", "academic background", "academics",
        "educational qualifications", "qualifications", "academic qualifications",
    ),
    "skills": (
        "skills", "technical skills", "technical skill set", "skill set", "technologies",
        "tech stack", "technical proficiencies", "core competencies", "tools and technologies",
    ),
    "projects": (
        "projects", "project", "personal projects", "academic projects", "key projects",
        "selected projects", "side projects",
    ),
    "experience": (
        "experience", "work experience", "professional experience", "employment history",
        "work history", "professional background", "internships", "internship",
    ),
    "certifications": (
        "certifications", "certificates", "licenses", "licenses and certifications",
        "courses", "trainings", "certifications and courses",
    ),
    "achievements": (
        "achievements", "awards", "honors", "honours", "accomplishments",
        "awards and achievements", "achievements and awards",
    ),
    "contact": ("contact", "contact details", "contact information", "personal details"),
    "links": ("links", "profiles", "coding profiles", "online profiles"),
}

_BULLET_RE = re.compile(r"^\s*(?:[#>*+\u2022\u00b7\u2023\u25e6-]+\s*|\d{1,2}[.)]\s+)")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(?:\+?\d[\d\s().\-]{7,}\d)")
_URL_RE = re.compile(r"https?://[^\s<>()\[\]{}\"']+")
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
_CGPA_RE = re.compile(r"\b(?:cgpa|gpa)\b[:\s]*([0-9]{1,2}(?:\.[0-9]{1,2})?)", re.I)
_PERCENT_RE = re.compile(r"\b([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*%")
_LOCATION_RE = re.compile(r"\blocation\s*[:\-]\s*(.+)", re.I)
_ROLE_WORD_RE = re.compile(
    r"\b(developer|engineer|designer|analyst|scientist|student|intern|manager|architect|"
    r"consultant|programmer|administrator|specialist)\b",
    re.I,
)
_DEGREE_WORD_RE = re.compile(
    r"\b(bachelor|master|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|"
    r"bca|mca|diploma|ph\.?\s?d|higher secondary|hsc|ssc|secondary|intermediate)\b",
    re.I,
)
_DEGREE_PHRASE_RE = re.compile(
    r"(bachelor of [a-z ]+|master of [a-z ]+|bachelor'?s? (?:of )?[a-z ]*|master'?s? (?:of )?[a-z ]*|"
    r"b\.?\s?tech[a-z. ]*|m\.?\s?tech[a-z. ]*|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc[a-z. ]*|m\.?\s?sc[a-z. ]*|"
    r"bca|mca|diploma in [a-z ]+|higher secondary[ a-z]*|hsc|ssc|ph\.?\s?d[a-z. ]*)",
    re.I,
)
_INSTITUTION_WORD_RE = re.compile(
    r"\b(university|college|institute|institution|school|academy|iit|nit|iiit)\b", re.I
)
_FIELD_RE = re.compile(
    r"\b(computer science|computer engineering|information technology|software engineering|"
    r"electronics|electrical|mechanical|civil|data science|science|commerce|arts|engineering)\b",
    re.I,
)
_DATE_RANGE_RE = re.compile(
    r"((?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|(?:19|20)\d{2}|[A-Za-z]{3,9}\s+(?:19|20)\d{2})"
    r"\s*(?:-|\u2013|\u2014|to)\s*"
    r"((?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|(?:19|20)\d{2}|[A-Za-z]{3,9}\s+(?:19|20)\d{2}|present|current)",
    re.I,
)

#: Coding-platform host fragments mapped to the platform's display name.
_CODING_PLATFORMS: tuple[tuple[str, str], ...] = (
    ("leetcode.com", "LeetCode"),
    ("hackerrank.com", "HackerRank"),
    ("codechef.com", "CodeChef"),
    ("codeforces.com", "Codeforces"),
    ("hackerearth.com", "HackerEarth"),
    ("interviewbit.com", "InterviewBit"),
    ("geeksforgeeks.org", "GeeksforGeeks"),
    ("codesignal.com", "CodeSignal"),
)


def _resume_lines(text: str) -> list[str]:
    """Split resume text into right-stripped lines."""
    return [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]


def _strip_bullet(line: str) -> str:
    """Remove a leading bullet marker or list number from ``line``."""
    return _BULLET_RE.sub("", line)


def _detect_heading(line: str) -> str | None:
    """Return the canonical section key when ``line`` is a section heading."""
    cleaned = _strip_bullet(line).strip().strip(":").strip()
    if not cleaned or len(cleaned) > 40:
        return None
    normalised = re.sub(r"[^a-z ]+", " ", cleaned.lower())
    normalised = re.sub(r"\s+", " ", normalised).strip()
    if not normalised:
        return None
    for key, keywords in _SECTION_KEYWORDS.items():
        if normalised in keywords:
            return key
    return None


def _split_resume_sections(
    lines: Sequence[str],
) -> tuple[list[str], dict[str, list[str]], list[str]]:
    """Split resume lines into a header block and named sections."""
    header: list[str] = []
    sections: dict[str, list[str]] = {}
    order: list[str] = []
    current: str | None = None
    for line in lines:
        key = _detect_heading(line)
        if key is not None:
            if key not in sections:
                sections[key] = []
                order.append(key)
            current = key
            continue
        if current is None:
            header.append(line)
        else:
            sections[current].append(line)
    return header, sections, order


def _match_skills(text: str) -> list[tuple[str, str]]:
    """Return ``(display, category)`` pairs for technologies named in ``text``, in order.

    Overlapping matches are resolved in favour of the longest term, so "Spring Boot"
    does not also record "Spring" and "JavaScript" does not also record "Java".
    """
    spans: list[tuple[int, int, str, str]] = []
    for term, (display, category) in _RESUME_SKILLS.items():
        pattern = re.compile(
            r"(?<![A-Za-z0-9+#.])" + re.escape(term) + r"(?![A-Za-z0-9+#])", re.I
        )
        for match in pattern.finditer(text):
            spans.append((match.start(), match.end(), display, category))

    kept: list[tuple[int, int, str, str]] = []
    for span in spans:
        covered = any(
            other[0] <= span[0]
            and span[1] <= other[1]
            and (other[1] - other[0]) > (span[1] - span[0])
            for other in spans
        )
        if not covered:
            kept.append(span)
    kept.sort(key=lambda item: item[0])

    ordered: list[tuple[str, str]] = []
    seen: set[str] = set()
    for _start, _end, display, category in kept:
        if display not in seen:
            seen.add(display)
            ordered.append((display, category))
    return ordered


def _skills_dict(text: str) -> dict[str, list[str]]:
    """Build a ``skills`` object from every recognised technology in ``text``."""
    grouped: dict[str, list[str]] = {}
    for display, category in _match_skills(text):
        grouped.setdefault(category, []).append(display)
    return {category: grouped[category] for category in _SKILL_CATEGORY_ORDER if category in grouped}


def _technology_list(text: str) -> list[str]:
    """Flat, ordered list of recognised technologies in ``text``."""
    return [display for display, _category in _match_skills(text)]


def _split_list(value: str) -> list[str]:
    """Split a comma/semicolon/slash separated list into clean items."""
    parts = re.split(r"[,;|/]| and ", value)
    return [part.strip().strip(".") for part in parts if part.strip()]


def _guess_full_name(header: Sequence[str]) -> str:
    """Heuristically identify the candidate name in the resume header."""
    for raw in header:
        text = _strip_bullet(raw).strip()
        if not text:
            continue
        lowered = text.lower()
        if any(token in lowered for token in ("resume", "curriculum vitae", "@", "http", "linkedin", "github")):
            continue
        if ":" in text:
            label, rest = text.split(":", 1)
            if label.strip().lower() in {"name", "full name", "candidate"}:
                text = rest.strip()
        if not text or any(ch.isdigit() for ch in text):
            continue
        words = text.replace(",", " ").split()
        if not (1 < len(words) <= 5):
            continue
        if not all(re.fullmatch(r"[A-Za-z][A-Za-z.'\-]*", word) for word in words):
            continue
        if not text[0].isupper():
            continue
        return text
    return ""


def _guess_headline(header: Sequence[str], name: str) -> str:
    """Identify a short professional headline from the resume header."""
    for raw in header:
        text = _strip_bullet(raw).strip()
        if not text or text == name:
            continue
        lowered = text.lower()
        if "@" in text or "http" in lowered or any(ch.isdigit() for ch in text):
            continue
        if _ROLE_WORD_RE.search(text) or ("|" in text and len(text) <= 80):
            return text
    return ""


def _parse_education(lines: Sequence[str]) -> list[dict[str, Any]]:
    """Parse the education section into profile-shaped entries."""
    groups: list[str] = []
    for raw in lines:
        text = _strip_bullet(raw).strip()
        if not text:
            continue
        if _DEGREE_WORD_RE.search(text) or _INSTITUTION_WORD_RE.search(text):
            groups.append(text)
        elif groups and (_YEAR_RE.search(text) or _CGPA_RE.search(text) or _PERCENT_RE.search(text)):
            groups[-1] += " " + text

    entries: list[dict[str, Any]] = []
    for text in groups:
        entry: dict[str, Any] = {}
        institution_match = _INSTITUTION_WORD_RE.search(text)
        if institution_match:
            for segment in re.split(r"[,;|\u2013\u2014]", text):
                if _INSTITUTION_WORD_RE.search(segment):
                    institution = segment.strip()
                    institution = _DEGREE_PHRASE_RE.sub("", institution).strip(" ,;-")
                    if institution:
                        entry["institution"] = institution
                    break
        degree_match = _DEGREE_PHRASE_RE.search(text)
        if degree_match:
            entry["degree"] = degree_match.group(0).strip(" ,;-").strip()
        field_match = _FIELD_RE.search(text)
        if field_match:
            entry["field"] = field_match.group(0).strip().title()
        years = _YEAR_RE.findall(text)
        if len(years) >= 2:
            entry["startYear"], entry["graduationYear"] = years[0], years[1]
        elif years:
            entry["graduationYear"] = years[0]
        cgpa = _CGPA_RE.search(text)
        percent = _PERCENT_RE.search(text)
        if cgpa:
            entry["grade"] = f"CGPA {cgpa.group(1)}"
        elif percent:
            entry["grade"] = f"{percent.group(1)}%"
        if entry.get("institution") or entry.get("degree"):
            entries.append(entry)
    return entries


def _project_url(project: dict[str, Any], url: str) -> None:
    """Attach a repository or live URL to a project block."""
    if "github.com" in url or "gitlab.com" in url or "bitbucket.org" in url:
        project.setdefault("repositoryUrl", url)
    else:
        project.setdefault("liveUrl", url)


def _parse_projects(lines: Sequence[str]) -> list[dict[str, Any]]:
    """Parse the projects section into profile-shaped entries."""
    blocks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        bullet = _strip_bullet(raw).strip()
        urls = _URL_RE.findall(stripped)
        is_bullet = bullet != stripped
        if is_bullet:
            if current is None:
                current = {"highlights": []}
            if bullet:
                current.setdefault("highlights", []).append(bullet)
            for url in urls:
                _project_url(current, url)
            continue
        if urls and stripped == urls[0]:
            if current is not None:
                _project_url(current, urls[0])
            continue
        name, description = stripped, ""
        split = re.split(r"\s+-\s+|\s*[:\u2013\u2014]\s+", stripped, maxsplit=1)
        if len(split) == 2 and len(split[0]) <= 60:
            name, description = split[0].strip(), split[1].strip()
        if current is not None:
            blocks.append(current)
        current = {"name": name}
        if description:
            current["description"] = description
        for url in urls:
            _project_url(current, url)

    if current is not None:
        blocks.append(current)

    projects: list[dict[str, Any]] = []
    for block in blocks:
        block_text = " ".join(
            str(value)
            for value in [block.get("name", ""), block.get("description", "")]
            + block.get("highlights", [])
        )
        technologies = _technology_list(block_text)
        if technologies:
            block["technologies"] = technologies
        if not block.get("highlights"):
            block.pop("highlights", None)
        if block.get("name"):
            projects.append(block)
    return projects


def _parse_experience(lines: Sequence[str]) -> list[dict[str, Any]]:
    """Parse the experience section into profile-shaped entries."""
    blocks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        bullet = _strip_bullet(raw).strip()
        if _strip_bullet(raw) != stripped:
            if current is None:
                current = {}
            if bullet:
                current.setdefault("_description", []).append(bullet)
            continue
        if current is not None:
            blocks.append(current)
        current = {"_header": stripped}

    if current is not None:
        blocks.append(current)

    entries: list[dict[str, Any]] = []
    for block in blocks:
        header = block.get("_header", "")
        entry: dict[str, Any] = {}
        role_company = re.split(r"\s+(?:at|@)\s+", header, maxsplit=1, flags=re.I)
        if len(role_company) == 2:
            entry["role"], entry["company"] = role_company[0].strip(), role_company[1].strip()
        else:
            parts = re.split(r"\s+-\s+|\s*\|\s*|\s*,\s*", header, maxsplit=1)
            entry["role"] = parts[0].strip()
            if len(parts) == 2:
                entry["company"] = parts[1].strip()
        entry["role"] = _DATE_RANGE_RE.sub("", entry["role"]).strip(" ,;-")
        if "company" in entry:
            entry["company"] = _DATE_RANGE_RE.sub("", entry["company"]).strip(" ,;-")
        date_range = _DATE_RANGE_RE.search(header)
        if date_range:
            entry["startDate"] = date_range.group(1).strip()
            entry["endDate"] = date_range.group(2).strip()
        description = block.get("_description", [])
        if description:
            entry["description"] = " ".join(description)
        if re.search(r"\bintern(?:ship)?\b", header, re.I):
            entry["type"] = "internship"
        block_text = " ".join([header, *description])
        technologies = _technology_list(block_text)
        if technologies:
            entry["technologies"] = technologies
        if entry.get("role") or entry.get("company"):
            entries.append(entry)
    return entries


def _parse_certifications(lines: Sequence[str]) -> list[dict[str, Any]]:
    """Parse the certifications section into profile-shaped entries."""
    certifications: list[dict[str, Any]] = []
    for raw in lines:
        text = _strip_bullet(raw).strip()
        if not text:
            continue
        entry: dict[str, Any] = {}
        split = re.split(r"\s+-\s+|\s*\|\s*", text, maxsplit=1)
        entry["name"] = split[0].strip()
        if len(split) == 2:
            entry["issuer"] = split[1].strip()
        year = _YEAR_RE.search(text)
        if year:
            entry["year"] = year.group(0)
        if entry["name"]:
            certifications.append(entry)
    return certifications


def _parse_achievements(lines: Sequence[str]) -> list[str]:
    """Parse the achievements section into a list of statements."""
    achievements: list[str] = []
    for raw in lines:
        text = _strip_bullet(raw).strip()
        if text:
            achievements.append(text)
    return achievements


def _platform_for_url(url: str) -> str | None:
    lowered = url.lower()
    for fragment, name in _CODING_PLATFORMS:
        if fragment in lowered:
            return name
    return None


def _handle_from_url(url: str) -> str | None:
    path = url.rstrip("/").split("?")[0].rstrip("/")
    handle = path.split("/")[-1]
    return handle or None


def _classify_urls(
    urls: Sequence[str],
) -> tuple[dict[str, str], list[dict[str, Any]]]:
    """Split URLs into profile links and coding profiles."""
    links: dict[str, str] = {}
    coding_profiles: list[dict[str, Any]] = []
    for url in urls:
        lowered = url.lower()
        platform = _platform_for_url(url)
        if platform is not None:
            profile: dict[str, Any] = {"platform": platform, "url": url}
            handle = _handle_from_url(url)
            if handle:
                profile["handle"] = handle
            if not any(item.get("url") == url for item in coding_profiles):
                coding_profiles.append(profile)
            if platform == "LeetCode":
                links.setdefault("leetcode", url)
            continue
        if "github.com" in lowered:
            links.setdefault("github", url)
        elif "linkedin.com" in lowered:
            links.setdefault("linkedin", url)
        else:
            links.setdefault("portfolio", url)
    return links, coding_profiles


def _parse_career_interests(text: str) -> dict[str, Any]:
    """Parse explicitly labelled career preferences from the resume."""
    interests: dict[str, Any] = {}
    roles = re.search(r"(?:preferred roles?|looking for|target roles?|desired roles?)\s*[:\-]\s*(.+)", text, re.I)
    if roles:
        parsed = _split_list(roles.group(1))
        if parsed:
            interests["preferredRoles"] = parsed
    locations = re.search(r"(?:preferred locations?|open to locations?)\s*[:\-]\s*(.+)", text, re.I)
    if locations:
        parsed = _split_list(locations.group(1))
        if parsed:
            interests["preferredLocations"] = parsed
    work_type = re.search(r"(?:work type|employment type)\s*[:\-]\s*(.+)", text, re.I)
    if work_type:
        value = work_type.group(1).strip()
        if value:
            interests["workType"] = value
    return interests


def _build_resume_extraction(text: str) -> ResumeExtraction:
    """Build a deterministic, unverified profile draft from resume text."""
    lines = _resume_lines(text)
    header, sections, order = _split_resume_sections(lines)
    draft: dict[str, Any] = {}
    warnings: list[str] = []

    header_text = "\n".join(header)
    contact_text = header_text + "\n" + "\n".join(sections.get("contact", []))

    name = _guess_full_name(header)
    if name:
        draft["fullName"] = name
    else:
        warnings.append("The candidate name could not be identified from the resume header.")

    headline = _guess_headline(header, name)
    if headline:
        draft["headline"] = headline

    email = _EMAIL_RE.search(text)
    if email:
        draft["email"] = email.group(0)
    phone = _PHONE_RE.search(contact_text)
    if phone:
        draft["phone"] = phone.group(0).strip()

    location = _LOCATION_RE.search(text)
    if location:
        value = location.group(1).strip()
        if value:
            draft["location"] = value

    if sections.get("summary"):
        summary = " ".join(part for part in (line.strip() for line in sections["summary"]) if part)
        if summary:
            draft["summary"] = summary

    skills = _skills_dict(text)
    if skills:
        draft["skills"] = skills

    learning = re.search(r"currently learning\s*[:\-]\s*(.+)", text, re.I)
    if learning:
        parsed = _split_list(learning.group(1))
        if parsed:
            draft["currentlyLearning"] = parsed

    if sections.get("education"):
        education = _parse_education(sections["education"])
        if education:
            draft["education"] = education
        else:
            warnings.append("An education section was detected but no clear entry could be extracted.")
    if sections.get("projects"):
        projects = _parse_projects(sections["projects"])
        if projects:
            draft["projects"] = projects
        else:
            warnings.append("A projects section was detected but no clear project could be extracted.")
    if sections.get("experience"):
        experience = _parse_experience(sections["experience"])
        if experience:
            draft["experience"] = experience
        else:
            warnings.append("An experience section was detected but no clear entry could be extracted.")
    if sections.get("achievements"):
        achievements = _parse_achievements(sections["achievements"])
        if achievements:
            draft["achievements"] = achievements
    if sections.get("certifications"):
        certifications = _parse_certifications(sections["certifications"])
        if certifications:
            draft["certifications"] = certifications

    urls = _URL_RE.findall(text)
    links, coding_profiles = _classify_urls(urls)
    if links:
        draft["links"] = links
    if coding_profiles:
        draft["codingProfiles"] = coding_profiles

    interests = _parse_career_interests(text)
    if interests:
        draft["careerInterests"] = interests

    detected = list(order)
    if "contact" not in detected and (email or phone):
        detected.append("contact")
    if "links" not in detected and links:
        detected.append("links")

    if not draft:
        warnings.append(
            "No structured information could be confidently extracted; the document may be "
            "image-based or formatted in an unsupported way."
        )

    return ResumeExtraction(draft=draft, detected_sections=detected, warnings=warnings)
