package com.aiportfolio.dto;

/**
 * Read-only operational view of the AI integration.
 *
 * <p>Deliberately contains no credential: the provider name and model are safe
 * to display, the API key is not and is never included.</p>
 */
public record AdminAiDiagnosticsDto(
        String status,
        boolean reachable,
        String provider,
        String model,
        Long latencyMs,
        String message,
        long responseTimeoutMs,
        long connectTimeoutMs,
        long resumeMaxBytes,
        int chatHistoryLimit,
        int chatRateLimitPerMinute
) {
}
