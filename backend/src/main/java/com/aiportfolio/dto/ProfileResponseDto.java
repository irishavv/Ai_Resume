package com.aiportfolio.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

/**
 * The stored candidate profile as opaque JSON plus its last update time.
 */
public record ProfileResponseDto(
        JsonNode profile,
        Instant updatedAt
) {
}
