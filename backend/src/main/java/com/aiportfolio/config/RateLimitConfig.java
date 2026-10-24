package com.aiportfolio.config;

import com.aiportfolio.service.RateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the in-memory rate limiter using the configured per-minute allowance.
 */
@Configuration
public class RateLimitConfig {

    private static final long WINDOW_MS = 60_000L;

    @Bean
    public RateLimiter rateLimiter(AppProperties properties) {
        return new RateLimiter(properties.getRateLimit().getChatPerMinute(), WINDOW_MS);
    }
}
