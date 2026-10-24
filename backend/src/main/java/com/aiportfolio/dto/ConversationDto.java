package com.aiportfolio.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Conversation summary returned by the list and create endpoints.
 */
public record ConversationDto(
        UUID id,
        String title,
        Instant createdAt,
        Instant updatedAt,
        int messageCount
) {
}
