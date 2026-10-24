package com.aiportfolio.dto;

/**
 * A single job requirement and how the candidate profile satisfies it.
 * {@code kind} is typically {@code required} or {@code preferred}.
 */
public record MatchedRequirement(
        String requirement,
        String kind,
        String evidence,
        boolean matched
) {
}
