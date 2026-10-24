package com.aiportfolio.dto;

import java.time.Instant;

/**
 * Headline counters for the console dashboard.
 */
public record AdminStatsDto(
        long conversations,
        long messages,
        long projects,
        long skills,
        long educationEntries,
        long experienceEntries,
        long certifications,
        long auditEntries,
        Instant profileUpdatedAt,
        Instant settingsUpdatedAt
) {
}
