package com.aiportfolio.service;

import com.aiportfolio.exception.InvalidSettingsException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Structural validation of the site settings document.
 *
 * <p>Only the invariants the application actually relies on are enforced: the
 * branding strings, the boolean feature flags, the colour format and a job-match
 * rubric whose weights sum to exactly 100. Unknown keys are tolerated so a new
 * setting can be introduced without a code change.</p>
 */
@Component
public class SettingsValidator {

    private static final Pattern HEX_COLOR = Pattern.compile("^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$");
    private static final Map<String, List<String>> REQUIRED_TEXT = Map.of(
            "site", List.of("name", "shortName", "initials", "tagline"),
            "hero", List.of("eyebrow", "headline", "summary", "summaryLabel"));
    private static final Map<String, List<String>> REQUIRED_FLAGS = Map.of(
            "features", List.of("chat", "jobMatch", "pdfExport", "languageToggle", "voiceInput", "themeToggle"),
            "contact", List.of("showEmail", "showPhone", "showLocation"));
    private static final List<String> STAT_LABELS =
            List.of("projects", "skills", "education", "experience", "learning");
    private static final int RUBRIC_MIN_CRITERIA = 1;
    private static final int RUBRIC_MAX_CRITERIA = 10;
    private static final int QUESTIONS_MAX = 30;

    public List<String> validate(JsonNode settings) {
        List<String> problems = new ArrayList<>();
        if (settings == null || !settings.isObject()) {
            problems.add("settings must be a JSON object");
            return problems;
        }

        REQUIRED_TEXT.forEach((section, fields) ->
                problems.addAll(validateTextSection(settings.get(section), section, fields)));
        REQUIRED_FLAGS.forEach((section, flags) ->
                problems.addAll(validateFlagSection(settings.get(section), section, flags)));

        validateAccentColor(settings.path("site").get("accentColor"), problems);
        validateLogoUrl(settings.path("site").get("logoUrl"), problems);
        validateStatLabels(settings.path("hero").get("statLabels"), problems);
        validateQuestions(settings.get("questions"), problems);
        validateFooter(settings.get("footer"), problems);
        validateAi(settings.get("ai"), problems);

        return problems;
    }

    public void validateOrThrow(JsonNode settings) {
        List<String> problems = validate(settings);
        if (!problems.isEmpty()) {
            throw new InvalidSettingsException(problems);
        }
    }

    private static List<String> validateTextSection(JsonNode section, String name, List<String> fields) {
        List<String> problems = new ArrayList<>();
        if (section == null || !section.isObject()) {
            problems.add("'" + name + "' is required and must be an object");
            return problems;
        }
        for (String field : fields) {
            JsonNode node = section.get(field);
            if (node == null || !node.isTextual() || node.asText().isBlank()) {
                problems.add("'" + name + "." + field + "' is required and must be a non-blank string");
            }
        }
        return problems;
    }

    private static List<String> validateFlagSection(JsonNode section, String name, List<String> flags) {
        List<String> problems = new ArrayList<>();
        if (section == null || !section.isObject()) {
            problems.add("'" + name + "' is required and must be an object");
            return problems;
        }
        for (String flag : flags) {
            JsonNode node = section.get(flag);
            if (node == null || !node.isBoolean()) {
                problems.add("'" + name + "." + flag + "' is required and must be true or false");
            }
        }
        return problems;
    }

    private static void validateAccentColor(JsonNode node, List<String> problems) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (!node.isTextual() || !HEX_COLOR.matcher(node.asText().trim()).matches()) {
            problems.add("'site.accentColor' must be a hex colour such as #4f46e5");
        }
    }

    private static void validateLogoUrl(JsonNode node, List<String> problems) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (!node.isTextual()) {
            problems.add("'site.logoUrl' must be a string");
            return;
        }
        String value = node.asText().trim();
        if (!value.isEmpty() && !(value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/"))) {
            problems.add("'site.logoUrl' must be an absolute URL, a root relative path or blank");
        }
    }

    private static void validateFooter(JsonNode footer, List<String> problems) {
        if (footer == null || footer.isMissingNode() || footer.isNull()) {
            return;
        }
        if (!footer.isObject()) {
            problems.add("'footer' must be an object");
            return;
        }
        JsonNode text = footer.get("text");
        if (text != null && !text.isTextual()) {
            problems.add("'footer.text' must be a string");
        }
        JsonNode showDisclaimer = footer.get("showDisclaimer");
        if (showDisclaimer != null && !showDisclaimer.isBoolean()) {
            problems.add("'footer.showDisclaimer' must be true or false");
        }
        JsonNode disclaimerText = footer.get("disclaimerText");
        if (disclaimerText != null && !disclaimerText.isTextual()) {
            problems.add("'footer.disclaimerText' must be a string");
        }
    }

    /** The optional labels of the welcome screen's "at a glance" counters. */
    private static void validateStatLabels(JsonNode statLabels, List<String> problems) {
        if (statLabels == null || statLabels.isMissingNode() || statLabels.isNull()) {
            return;
        }
        if (!statLabels.isObject()) {
            problems.add("'hero.statLabels' must be an object");
            return;
        }
        for (String key : STAT_LABELS) {
            JsonNode node = statLabels.get(key);
            if (node != null && !node.isTextual()) {
                problems.add("'hero.statLabels." + key + "' must be a string");
            }
        }
    }

    /** The recruiter prompts shown on the welcome screen; an empty list is allowed. */
    private static void validateQuestions(JsonNode questions, List<String> problems) {
        if (questions == null || questions.isMissingNode() || questions.isNull()) {
            return;
        }
        if (!questions.isArray()) {
            problems.add("'questions' must be an array");
            return;
        }
        if (questions.size() > QUESTIONS_MAX) {
            problems.add("'questions' supports at most " + QUESTIONS_MAX + " entries");
            return;
        }
        for (int index = 0; index < questions.size(); index++) {
            JsonNode item = questions.get(index);
            if (item == null || !item.isObject()) {
                problems.add("'questions[" + index + "]' must be an object");
                continue;
            }
            JsonNode label = item.get("label");
            if (label == null || !label.isTextual() || label.asText().isBlank()) {
                problems.add("'questions[" + index + "].label' must be a non-blank string");
            }
            JsonNode question = item.get("question");
            if (question == null || !question.isTextual() || question.asText().isBlank()) {
                problems.add("'questions[" + index + "].question' must be a non-blank string");
            }
            JsonNode featured = item.get("featured");
            if (featured != null && !featured.isBoolean()) {
                problems.add("'questions[" + index + "].featured' must be true or false");
            }
        }
    }

    private static void validateAi(JsonNode ai, List<String> problems) {
        if (ai == null || ai.isMissingNode() || ai.isNull()) {
            return;
        }
        if (!ai.isObject()) {
            problems.add("'ai' must be an object");
            return;
        }

        JsonNode historyLimit = ai.get("historyLimit");
        if (historyLimit != null && (!historyLimit.isInt() || historyLimit.asInt() < 1 || historyLimit.asInt() > 200)) {
            problems.add("'ai.historyLimit' must be a whole number between 1 and 200");
        }

        JsonNode rateLimit = ai.get("rateLimitPerMinute");
        if (rateLimit != null && (!rateLimit.isInt() || rateLimit.asInt() < 0 || rateLimit.asInt() > 10_000)) {
            problems.add("'ai.rateLimitPerMinute' must be a whole number between 0 and 10000");
        }

        JsonNode rubric = ai.get("jobMatchRubric");
        if (rubric == null || rubric.isMissingNode() || rubric.isNull()) {
            return;
        }
        if (!rubric.isArray()) {
            problems.add("'ai.jobMatchRubric' must be an array");
            return;
        }
        if (rubric.size() < RUBRIC_MIN_CRITERIA || rubric.size() > RUBRIC_MAX_CRITERIA) {
            problems.add("'ai.jobMatchRubric' must contain between " + RUBRIC_MIN_CRITERIA + " and "
                    + RUBRIC_MAX_CRITERIA + " criteria");
            return;
        }

        int total = 0;
        for (int index = 0; index < rubric.size(); index++) {
            JsonNode item = rubric.get(index);
            if (item == null || !item.isObject()) {
                problems.add("'ai.jobMatchRubric[" + index + "]' must be an object");
                continue;
            }
            JsonNode criterion = item.get("criterion");
            if (criterion == null || !criterion.isTextual() || criterion.asText().isBlank()) {
                problems.add("'ai.jobMatchRubric[" + index + "].criterion' must be a non-blank string");
            }
            JsonNode weight = item.get("weight");
            if (weight == null || !weight.isInt() || weight.asInt() < 0 || weight.asInt() > 100) {
                problems.add("'ai.jobMatchRubric[" + index + "].weight' must be a whole number between 0 and 100");
            } else {
                total += weight.asInt();
            }
        }
        if (total != 100) {
            problems.add("'ai.jobMatchRubric' weights must sum to 100 (currently " + total + ")");
        }
    }
}
