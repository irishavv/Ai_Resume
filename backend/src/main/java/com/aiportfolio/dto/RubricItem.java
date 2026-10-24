package com.aiportfolio.dto;

/**
 * One weighted rubric criterion of a job match report.
 */
public record RubricItem(
        String criterion,
        int weight,
        double awardedScore,
        String rationale
) {
}
