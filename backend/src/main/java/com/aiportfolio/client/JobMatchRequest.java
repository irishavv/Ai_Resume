package com.aiportfolio.client;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Request body for {@code POST /ai/job-match}.
 *
 * <p>{@code rubric} is the operator-configured scoring rubric and may be
 * {@code null}, in which case the AI service applies its built-in default.</p>
 */
public record JobMatchRequest(
        JsonNode profile,
        String jobDescription,
        JsonNode rubric
) {
}
