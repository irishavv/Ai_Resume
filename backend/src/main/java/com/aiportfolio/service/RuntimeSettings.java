package com.aiportfolio.service;

import com.aiportfolio.config.AppProperties;
import org.springframework.stereotype.Component;

/**
 * Holds the operational limits that would normally be read once at startup but
 * are editable from the operator console.
 *
 * <p>The values are seeded from the {@code app.*} properties and are then
 * overridden by the stored settings document, so an environment variable always
 * remains the fallback rather than the only source of truth.</p>
 */
@Component
public class RuntimeSettings {

    private volatile int chatHistoryLimit;
    private volatile int chatRateLimitPerMinute;

    public RuntimeSettings(AppProperties properties) {
        this.chatHistoryLimit = properties.getChat().getHistoryLimit();
        this.chatRateLimitPerMinute = properties.getRateLimit().getChatPerMinute();
    }

    public int getChatHistoryLimit() {
        return chatHistoryLimit;
    }

    public void setChatHistoryLimit(int chatHistoryLimit) {
        this.chatHistoryLimit = Math.max(1, chatHistoryLimit);
    }

    public int getChatRateLimitPerMinute() {
        return chatRateLimitPerMinute;
    }

    public void setChatRateLimitPerMinute(int chatRateLimitPerMinute) {
        this.chatRateLimitPerMinute = Math.max(0, chatRateLimitPerMinute);
    }
}
