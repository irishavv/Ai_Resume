package com.aiportfolio.client;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

/**
 * Request body for {@code POST /ai/chat/stream}. The AI service owns prompt
 * construction, so the backend only forwards the raw profile, the history and
 * the requested answer language.
 */
public record ChatStreamRequest(
        JsonNode profile,
        List<Map<String, String>> messages,
        String question,
        String language
) {
}
