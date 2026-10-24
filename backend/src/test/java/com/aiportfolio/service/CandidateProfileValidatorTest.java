package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aiportfolio.exception.InvalidProfileException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class CandidateProfileValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CandidateProfileValidator validator = new CandidateProfileValidator();
    private JsonNode realProfile;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream inputStream = new ClassPathResource("candidate-profile.json").getInputStream()) {
            realProfile = objectMapper.readTree(inputStream);
        }
    }

    @Test
    void realClasspathProfilePasses() {
        assertThat(validator.validate(realProfile)).isEmpty();
    }

    @Test
    void everyMissingRequiredFieldIsReported() {
        for (String field : List.of("fullName", "headline", "summary", "education", "projects")) {
            ObjectNode copy = realProfile.deepCopy();
            copy.remove(field);

            List<String> problems = validator.validate(copy);

            assertThat(problems)
                    .as("problems for missing '%s'", field)
                    .anyMatch(problem -> problem.contains("'" + field + "'"));
        }
    }

    @Test
    void missingSkillsObjectIsReported() {
        ObjectNode copy = realProfile.deepCopy();
        copy.remove("skills");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("'skills'"));
    }

    @Test
    void missingSkillGroupIsReported() {
        ObjectNode copy = realProfile.deepCopy();
        ((ObjectNode) copy.get("skills")).remove("frameworks");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("skills.frameworks"));
    }

    @Test
    void badEmailIsReported() {
        ObjectNode copy = realProfile.deepCopy();
        copy.put("email", "not-an-email");

        assertThat(validator.validate(copy)).anyMatch(problem -> problem.contains("'email'"));
    }

    @Test
    void validateOrThrowRejectsInvalidProfile() {
        ObjectNode copy = realProfile.deepCopy();
        copy.remove("fullName");

        assertThatThrownBy(() -> validator.validateOrThrow(copy))
                .isInstanceOf(InvalidProfileException.class);
    }
}
