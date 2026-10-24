package com.aiportfolio.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

/**
 * The stored site settings as opaque JSON plus their last update time.
 */
public record SettingsResponseDto(
        JsonNode settings,
        Instant updatedAt
) {
}
