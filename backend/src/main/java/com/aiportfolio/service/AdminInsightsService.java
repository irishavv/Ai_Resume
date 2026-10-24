package com.aiportfolio.service;

import com.aiportfolio.client.AiServiceClient;
import com.aiportfolio.config.AiServiceProperties;
import com.aiportfolio.config.AppProperties;
import com.aiportfolio.dto.AdminAiDiagnosticsDto;
import com.aiportfolio.dto.AdminStatsDto;
import com.aiportfolio.dto.ProfileResponseDto;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.AdminAuditLogRepository;
import com.aiportfolio.repository.ConversationRepository;
import com.aiportfolio.repository.MessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only operational views for the console dashboard.
 *
 * <p>{@link #diagnostics()} probes the AI service and reports only non-secret
 * information: the provider name and model are safe to display, the API key and
 * any raw upstream payload are never included.</p>
 */
@Service
public class AdminInsightsService {

    private static final Logger log = LoggerFactory.getLogger(AdminInsightsService.class);
    private static final String[] SKILL_GROUPS =
            {"languages", "frameworks", "databases", "tools", "concepts"};

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final ProfileService profileService;
    private final SettingsService settingsService;
    private final AiServiceClient aiServiceClient;
    private final AiServiceProperties aiServiceProperties;
    private final AppProperties appProperties;
    private final RuntimeSettings runtimeSettings;

    public AdminInsightsService(ConversationRepository conversationRepository,
                                MessageRepository messageRepository,
                                AdminAuditLogRepository auditLogRepository,
                                ProfileService profileService,
                                SettingsService settingsService,
                                AiServiceClient aiServiceClient,
                                AiServiceProperties aiServiceProperties,
                                AppProperties appProperties,
                                RuntimeSettings runtimeSettings) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.auditLogRepository = auditLogRepository;
        this.profileService = profileService;
        this.settingsService = settingsService;
        this.aiServiceClient = aiServiceClient;
        this.aiServiceProperties = aiServiceProperties;
        this.appProperties = appProperties;
        this.runtimeSettings = runtimeSettings;
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        long projects = 0L;
        long skills = 0L;
        long educationEntries = 0L;
        long experienceEntries = 0L;
        long certifications = 0L;
        Instant profileUpdatedAt = null;

        try {
            ProfileResponseDto profile = profileService.getProfile();
            JsonNode node = profile.profile();
            projects = size(node.get("projects"));
            educationEntries = size(node.get("education"));
            experienceEntries = size(node.get("experience"));
            certifications = size(node.get("certifications"));
            JsonNode skillNode = node.get("skills");
            if (skillNode != null && skillNode.isObject()) {
                for (String group : SKILL_GROUPS) {
                    skills += size(skillNode.get(group));
                }
            }
            profileUpdatedAt = profile.updatedAt();
        } catch (ResourceNotFoundException ex) {
            // No profile has been configured yet; the counters stay at zero.
        }

        return new AdminStatsDto(
                conversationRepository.count(),
                messageRepository.count(),
                projects,
                skills,
                educationEntries,
                experienceEntries,
                certifications,
                auditLogRepository.count(),
                profileUpdatedAt,
                settingsService.getSettings().updatedAt());
    }

    @Transactional(readOnly = true)
    public AdminAiDiagnosticsDto diagnostics() {
        long startedAt = System.nanoTime();
        boolean reachable = false;
        String status = "unreachable";
        String provider = null;
        String model = null;
        String message = null;

        try {
            JsonNode health = aiServiceClient.health()
                    .block(Duration.ofMillis(aiServiceProperties.getResponseTimeoutMs()));
            if (health != null && !health.isNull()) {
                reachable = true;
                status = health.path("status").asText("ok");
                provider = textOrNull(health.get("provider"));
                model = textOrNull(health.get("model"));
            } else {
                message = "The AI service returned an empty health response.";
            }
        } catch (Exception ex) {
            log.warn("AI diagnostics probe failed: {}", ex.getClass().getSimpleName());
            message = "The AI service is not reachable from the backend.";
        }

        long latencyMs = (System.nanoTime() - startedAt) / 1_000_000L;
        return new AdminAiDiagnosticsDto(
                status,
                reachable,
                provider,
                model,
                latencyMs,
                message,
                aiServiceProperties.getResponseTimeoutMs(),
                aiServiceProperties.getConnectTimeoutMs(),
                appProperties.getResume().getMaxBytes(),
                runtimeSettings.getChatHistoryLimit(),
                runtimeSettings.getChatRateLimitPerMinute());
    }

    private static long size(JsonNode node) {
        return node != null && node.isArray() ? node.size() : 0L;
    }

    private static String textOrNull(JsonNode node) {
        return node != null && node.isTextual() ? node.asText() : null;
    }
}
