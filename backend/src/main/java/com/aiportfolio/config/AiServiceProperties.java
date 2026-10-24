package com.aiportfolio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the internal FastAPI AI service, bound from {@code ai-service.*}.
 */
@ConfigurationProperties(prefix = "ai-service")
public class AiServiceProperties {

    private String baseUrl = "http://localhost:8000";
    private int connectTimeoutMs = 5000;
    private int responseTimeoutMs = 120000;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getResponseTimeoutMs() {
        return responseTimeoutMs;
    }

    public void setResponseTimeoutMs(int responseTimeoutMs) {
        this.responseTimeoutMs = responseTimeoutMs;
    }
}
