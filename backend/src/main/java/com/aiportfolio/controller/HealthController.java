package com.aiportfolio.controller;

import com.aiportfolio.client.AiServiceClient;
import com.aiportfolio.config.AiServiceProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness/readiness summary. This endpoint never throws.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final AiServiceClient aiServiceClient;
    private final AiServiceProperties aiServiceProperties;

    public HealthController(JdbcTemplate jdbcTemplate, AiServiceClient aiServiceClient,
                            AiServiceProperties aiServiceProperties) {
        this.jdbcTemplate = jdbcTemplate;
        this.aiServiceClient = aiServiceClient;
        this.aiServiceProperties = aiServiceProperties;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean databaseUp = isDatabaseUp();
        boolean aiServiceUp = isAiServiceUp();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", databaseUp && aiServiceUp ? "ok" : "degraded");
        body.put("service", "backend");
        body.put("database", databaseUp ? "up" : "down");
        body.put("aiService", aiServiceUp ? "up" : "down");
        body.put("time", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    private boolean isDatabaseUp() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return result != null;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isAiServiceUp() {
        try {
            JsonNode response = aiServiceClient.health()
                    .block(Duration.ofMillis(aiServiceProperties.getConnectTimeoutMs() + 2_000L));
            return response != null;
        } catch (Exception ex) {
            return false;
        }
    }
}
