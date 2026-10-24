package com.aiportfolio.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

/**
 * Extraction result produced by the AI service for an uploaded resume.
 *
 * <p>The {@code draft} is intentionally kept as a free-form {@link JsonNode} so
 * the backend never reshapes or "corrects" what the AI service returned.</p>
 */
public record ResumeExtractionDto(
        JsonNode draft,
        List<String> detectedSections,
        List<String> warnings,
        String sourceFileName,
        int extractedCharacters,
        boolean verified
) {
}
