package com.aiportfolio.service;

import com.aiportfolio.exception.InvalidProfileException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Structural validation of the opaque candidate profile document.
 *
 * <p>The profile is deliberately untyped: this validator only enforces the small
 * set of invariants the rest of the application relies on, so the candidate
 * schema can keep evolving without code changes.</p>
 */
@Component
public class CandidateProfileValidator {

    private static final List<String> REQUIRED_TEXT_FIELDS = List.of("fullName", "headline", "summary");
    private static final List<String> REQUIRED_ARRAY_FIELDS = List.of("education", "projects");
    private static final List<String> REQUIRED_SKILL_ARRAY_FIELDS =
            List.of("languages", "frameworks", "databases", "tools", "concepts");
    private static final List<String> OPTIONAL_TEXT_FIELDS = List.of("location", "email", "phone");
    private static final List<String> OPTIONAL_ARRAY_FIELDS =
            List.of("currentlyLearning", "experience", "achievements", "certifications", "codingProfiles");
    private static final List<String> OPTIONAL_OBJECT_FIELDS = List.of("links", "careerInterests");

    /**
     * @return an empty list when the profile is valid, otherwise one message per problem.
     */
    public List<String> validate(JsonNode profile) {
        List<String> problems = new ArrayList<>();

        if (profile == null || !profile.isObject()) {
            problems.add("profile must be a JSON object");
            return problems;
        }

        for (String field : REQUIRED_TEXT_FIELDS) {
            if (!isNonBlankText(profile.get(field))) {
                problems.add("'" + field + "' is required and must be a non-blank string");
            }
        }

        for (String field : REQUIRED_ARRAY_FIELDS) {
            if (!isArray(profile.get(field))) {
                problems.add("'" + field + "' is required and must be an array");
            }
        }

        JsonNode skills = profile.get("skills");
        if (skills == null || !skills.isObject()) {
            problems.add("'skills' is required and must be an object");
        } else {
            for (String field : REQUIRED_SKILL_ARRAY_FIELDS) {
                if (!isArray(skills.get(field))) {
                    problems.add("'skills." + field + "' is required and must be an array");
                }
            }
        }

        for (String field : OPTIONAL_TEXT_FIELDS) {
            JsonNode node = profile.get(field);
            if (isPresent(node) && !node.isTextual()) {
                problems.add("'" + field + "' must be a string when present");
            }
        }

        JsonNode email = profile.get("email");
        if (isPresent(email) && email.isTextual()) {
            String value = email.asText();
            if (!value.isBlank() && !value.contains("@")) {
                problems.add("'email' must be a valid email address");
            }
        }

        for (String field : OPTIONAL_ARRAY_FIELDS) {
            JsonNode node = profile.get(field);
            if (isPresent(node) && !node.isArray()) {
                problems.add("'" + field + "' must be an array when present");
            }
        }

        for (String field : OPTIONAL_OBJECT_FIELDS) {
            JsonNode node = profile.get(field);
            if (isPresent(node) && !node.isObject()) {
                problems.add("'" + field + "' must be an object when present");
            }
        }

        return problems;
    }

    public void validateOrThrow(JsonNode profile) {
        List<String> problems = validate(profile);
        if (!problems.isEmpty()) {
            throw new InvalidProfileException(problems);
        }
    }

    private static boolean isPresent(JsonNode node) {
        return node != null && !node.isNull();
    }

    private static boolean isArray(JsonNode node) {
        return node != null && node.isArray();
    }

    private static boolean isNonBlankText(JsonNode node) {
        return node != null && node.isTextual() && !node.asText().isBlank();
    }
}
