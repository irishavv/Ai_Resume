package com.aiportfolio.dto;

import java.time.Instant;

/**
 * An open operator session. The token is returned exactly once, on login.
 */
public record AdminSessionDto(
        String token,
        String username,
        Instant expiresAt
) {
}
