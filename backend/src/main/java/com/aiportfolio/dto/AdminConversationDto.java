package com.aiportfolio.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * A conversation as seen by an operator: unlike the client facing DTO this one
 * exposes the owning client id so support can trace a report.
 */
public record AdminConversationDto(
        UUID id,
        String clientId,
        String title,
        Instant createdAt,
        Instant updatedAt,
        long messageCount
) {
}
