package com.aiportfolio.dto;

import java.time.Instant;

/**
 * Body of the standard error envelope.
 */
public record ApiErrorBody(
        String code,
        String message,
        Instant timestamp,
        String path
) {
}
