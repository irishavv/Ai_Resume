"""Job-description matching tests against the deterministic mock provider."""

from __future__ import annotations

JOB_DESCRIPTION = """We are hiring a Backend Developer to join our platform team.

Required skills:
- Strong Java and Spring Boot experience
- PostgreSQL data modelling
- Kubernetes and Docker in production
- REST API design

Preferred:
- React experience
"""


def test_job_match_returns_a_valid_scored_assessment(client, profile_dict):
    response = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION},
    )

    assert response.status_code == 200
    result = response.json()

    assert 0 <= result["suitabilityScore"] <= 100
    assert result["scoreLabel"]
    assert result["summary"]
    assert sum(item["weight"] for item in result["rubric"]) == 100
    assert len(result["rubric"]) == 5
    assert result["matchedRequirements"]
    assert {"required", "preferred"} >= {item["kind"] for item in result["matchedRequirements"]}
    assert len(result["suggestedInterviewQuestions"]) >= 5
    assert len(result["limitations"]) >= 2


def test_required_skills_present_in_the_profile_are_matched(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION},
    ).json()

    matched = {item["requirement"] for item in result["matchedRequirements"] if item["matched"]}

    assert "java" in matched
    assert "spring boot" in matched
    assert "postgresql" in matched
    for item in result["matchedRequirements"]:
        if item["matched"]:
            assert item["evidence"]
            assert "Not evidenced" not in item["evidence"]


def test_absent_requirements_are_reported_as_unverified_not_missing_skills(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION},
    ).json()

    assert result["missingOrUnverified"]
    assert any("kubernetes" in item.lower() for item in result["missingOrUnverified"])
    for item in result["missingOrUnverified"]:
        assert "not evidenced in the verified profile" in item.lower()
        assert "lacks" not in item.lower()
        assert "does not have" not in item.lower()


def test_disclaimer_frames_the_score_as_an_approximation(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION},
    ).json()

    disclaimer = result["disclaimer"].lower()

    assert "approximate profile-to-job match" in disclaimer
    assert "not a probability of hiring success" in disclaimer


def test_rubric_awards_points_out_of_each_weight(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION},
    ).json()

    for item in result["rubric"]:
        assert 0 <= item["awardedScore"] <= item["weight"]
        assert item["rationale"]


def test_short_job_description_is_rejected(client, profile_dict):
    response = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": "too short"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_missing_job_description_is_rejected(client, profile_dict):
    response = client.post("/ai/job-match", json={"profile": profile_dict})

    assert response.status_code == 422


OPERATOR_RUBRIC = [
    {"criterion": "Core language depth", "weight": 50},
    {"criterion": "Delivery track record", "weight": 30},
    {"criterion": "Academic foundation", "weight": 20},
]


def test_operator_supplied_rubric_drives_the_assessment(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={"profile": profile_dict, "jobDescription": JOB_DESCRIPTION, "rubric": OPERATOR_RUBRIC},
    ).json()

    criteria = [item["criterion"] for item in result["rubric"]]
    assert criteria == ["Core language depth", "Delivery track record", "Academic foundation"]
    assert sum(item["weight"] for item in result["rubric"]) == 100
    for item in result["rubric"]:
        assert 0 <= item["awardedScore"] <= item["weight"]


def test_invalid_operator_rubric_falls_back_to_the_default(client, profile_dict):
    result = client.post(
        "/ai/job-match",
        json={
            "profile": profile_dict,
            "jobDescription": JOB_DESCRIPTION,
            "rubric": [{"criterion": "Only criterion", "weight": 40}],
        },
    ).json()

    assert len(result["rubric"]) == 5
    assert sum(item["weight"] for item in result["rubric"]) == 100
