package com.aiportfolio.dto;

import java.time.Instant;

/**
 * One administrative change, as shown in the console audit trail.
 */
public record AdminAuditEntryDto(
        Long id,
        String action,
        String target,
        String summary,
        String actor,
        Instant createdAt
) {
}
