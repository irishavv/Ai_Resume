package com.aiportfolio.dto;

import java.util.List;

/**
 * Structured job match report produced by the AI service.
 */
public record JobMatchResultDto(
        int suitabilityScore,
        String scoreLabel,
        String summary,
        List<RubricItem> rubric,
        List<MatchedRequirement> matchedRequirements,
        List<String> missingOrUnverified,
        List<String> strengths,
        List<String> areasToEvaluate,
        List<String> suggestedInterviewQuestions,
        List<String> limitations,
        String disclaimer
) {
}
