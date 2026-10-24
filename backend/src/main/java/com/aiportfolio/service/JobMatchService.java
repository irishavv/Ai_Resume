package com.aiportfolio.service;

import com.aiportfolio.client.AiServiceClient;
import com.aiportfolio.config.AiServiceProperties;
import com.aiportfolio.dto.JobMatchResultDto;
import com.aiportfolio.exception.AiServiceUnavailableException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.stereotype.Service;

/**
 * Proxies a job match request to the AI service and maps the result to the
 * documented response shape.
 */
@Service
public class JobMatchService {

    private final ProfileService profileService;
    private final SettingsService settingsService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;
    private final long timeoutMs;

    public JobMatchService(ProfileService profileService, SettingsService settingsService,
                           AiServiceClient aiServiceClient, ObjectMapper objectMapper,
                           AiServiceProperties properties) {
        this.profileService = profileService;
        this.settingsService = settingsService;
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
        this.timeoutMs = properties.getResponseTimeoutMs() + 5_000L;
    }

    public JobMatchResultDto match(String jobDescription) {
        JsonNode profile = profileService.getProfileNode();
        JsonNode rubric = settingsService.jobMatchRubric();

        JsonNode result;
        try {
            result = aiServiceClient.jobMatch(profile, jobDescription, rubric).block(Duration.ofMillis(timeoutMs));
        } catch (Exception ex) {
            throw new AiServiceUnavailableException("The AI service is currently unavailable.", ex);
        }

        if (result == null || result.isNull()) {
            throw new AiServiceUnavailableException("The AI service returned an empty response.");
        }

        try {
            return objectMapper.treeToValue(result, JobMatchResultDto.class);
        } catch (JsonProcessingException ex) {
            throw new AiServiceUnavailableException("The AI service returned an unexpected response.", ex);
        }
    }
}
