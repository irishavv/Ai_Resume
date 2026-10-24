package com.aiportfolio.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * A message as returned to the browser. {@code role} is {@code user}/{@code assistant}
 * and {@code status} is the lower-case message status.
 */
public record MessageDto(
        UUID id,
        String role,
        String content,
        String status,
        Instant createdAt
) {
}
