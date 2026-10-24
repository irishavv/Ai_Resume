package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aiportfolio.exception.InvalidSettingsException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.InputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class SettingsValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SettingsValidator validator = new SettingsValidator();
    private JsonNode defaults;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream inputStream = new ClassPathResource("default-settings.json").getInputStream()) {
            defaults = objectMapper.readTree(inputStream);
        }
    }

    @Test
    void bundledDefaultsPass() {
        assertThat(validator.validate(defaults)).isEmpty();
    }

    @Test
    void missingBrandingSectionIsReported() {
        ObjectNode copy = defaults.deepCopy();
        copy.remove("site");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("'site'"));
    }

    @Test
    void blankSiteNameIsReported() {
        ObjectNode copy = defaults.deepCopy();
        ((ObjectNode) copy.get("site")).put("name", "   ");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("site.name"));
    }

    @Test
    void nonBooleanFeatureFlagIsReported() {
        ObjectNode copy = defaults.deepCopy();
        ((ObjectNode) copy.get("features")).put("chat", "yes");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("features.chat"));
    }

    @Test
    void malformedAccentColorIsReported() {
        ObjectNode copy = defaults.deepCopy();
        ((ObjectNode) copy.get("site")).put("accentColor", "indigo");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("site.accentColor"));
    }

    @Test
    void rubricWeightsThatDoNotSumToOneHundredAreReported() {
        ObjectNode copy = defaults.deepCopy();
        ArrayNode rubric = objectMapper.createArrayNode()
                .add(objectMapper.createObjectNode().put("criterion", "Core depth").put("weight", 60))
                .add(objectMapper.createObjectNode().put("criterion", "Delivery").put("weight", 30));
        ((ObjectNode) copy.get("ai")).set("jobMatchRubric", rubric);

        assertThat(validator.validate(copy))
                .anyMatch(problem -> problem.contains("jobMatchRubric") && problem.contains("100"));
    }

    @Test
    void outOfRangeHistoryLimitIsReported() {
        ObjectNode copy = defaults.deepCopy();
        ((ObjectNode) copy.get("ai")).put("historyLimit", 0);

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("ai.historyLimit"));
    }

    @Test
    void validateOrThrowRejectsAnInvalidDocument() {
        ObjectNode copy = defaults.deepCopy();
        copy.remove("hero");

        assertThatThrownBy(() -> validator.validateOrThrow(copy))
                .isInstanceOf(InvalidSettingsException.class);
    }
}
