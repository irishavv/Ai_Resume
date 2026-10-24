package com.aiportfolio.dto;

import java.time.Instant;

/**
 * The currently authenticated operator session. Unlike {@link AdminSessionDto}
 * this never carries the token, because the caller already holds it.
 */
public record AdminSessionInfoDto(
        String username,
        Instant expiresAt
) {
}
