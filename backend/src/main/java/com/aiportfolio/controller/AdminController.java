package com.aiportfolio.controller;

import com.aiportfolio.dto.AdminAiDiagnosticsDto;
import com.aiportfolio.dto.AdminConversationDetailDto;
import com.aiportfolio.dto.AdminConversationDto;
import com.aiportfolio.dto.AdminStatsDto;
import com.aiportfolio.dto.AdminAuditEntryDto;
import com.aiportfolio.dto.PageDto;
import com.aiportfolio.dto.ProfileResponseDto;
import com.aiportfolio.dto.ResumeExtractionDto;
import com.aiportfolio.dto.SettingsResponseDto;
import com.aiportfolio.service.AdminAuditService;
import com.aiportfolio.service.AdminAuthService;
import com.aiportfolio.service.AdminConversationService;
import com.aiportfolio.service.AdminInsightsService;
import com.aiportfolio.service.ProfileService;
import com.aiportfolio.service.ResumeService;
import com.aiportfolio.service.SettingsService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * The operator console API.
 *
 * <p>Every route is guarded by {@code AdminSessionFilter}; the authenticated
 * operator name arrives as a request attribute and is written to the audit
 * trail on every change. No endpoint here ever returns a credential.</p>
 */
@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminController {

    private static final int MAX_PAGE_SIZE = 100;

    private final ProfileService profileService;
    private final SettingsService settingsService;
    private final AdminConversationService conversationService;
    private final AdminInsightsService insightsService;
    private final AdminAuditService auditService;
    private final ResumeService resumeService;

    public AdminController(ProfileService profileService,
                           SettingsService settingsService,
                           AdminConversationService conversationService,
                           AdminInsightsService insightsService,
                           AdminAuditService auditService,
                           ResumeService resumeService) {
        this.profileService = profileService;
        this.settingsService = settingsService;
        this.conversationService = conversationService;
        this.insightsService = insightsService;
        this.auditService = auditService;
        this.resumeService = resumeService;
    }

    // ------------------------------------------------------------------ #
    // Dashboard
    // ------------------------------------------------------------------ #

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return insightsService.stats();
    }

    // ------------------------------------------------------------------ #
    // Candidate profile
    // ------------------------------------------------------------------ #

    @GetMapping("/profile")
    public ProfileResponseDto profile() {
        return profileService.getProfile();
    }

    @PutMapping("/profile")
    public ProfileResponseDto replaceProfile(@RequestBody JsonNode body,
                                             @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        ProfileResponseDto updated = profileService.replace(body);
        auditService.record("PROFILE_REPLACE", "profile", "Replaced the full candidate profile.", actor);
        return updated;
    }

    @PutMapping("/profile/sections/{section}")
    public ProfileResponseDto replaceProfileSection(@PathVariable String section,
                                                    @RequestBody JsonNode body,
                                                    @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        ProfileResponseDto updated = profileService.replaceSection(section, body);
        auditService.record("PROFILE_SECTION_UPDATE", "profile." + section,
                "Updated the profile section '" + section + "'.", actor);
        return updated;
    }

    // ------------------------------------------------------------------ #
    // Resume import
    // ------------------------------------------------------------------ #

    /**
     * Extracts a profile draft from an uploaded PDF. The file is processed in
     * memory and never persisted; the draft is only a proposal the operator
     * reviews before anything is written to the profile.
     */
    @PostMapping(value = "/resume/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResumeExtractionDto extractResume(@RequestPart(value = "file", required = false) MultipartFile file,
                                             @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        ResumeExtractionDto draft = resumeService.extract(file);
        auditService.record("RESUME_EXTRACT", "resume", "Extracted a resume draft for review.", actor);
        return draft;
    }

    // ------------------------------------------------------------------ #
    // Site settings
    // ------------------------------------------------------------------ #

    @GetMapping("/settings")
    public SettingsResponseDto settings() {
        return settingsService.getSettings();
    }

    @PutMapping("/settings")
    public SettingsResponseDto replaceSettings(@RequestBody JsonNode body,
                                               @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        SettingsResponseDto updated = settingsService.replace(body);
        auditService.record("SETTINGS_UPDATE", "settings", "Updated the site settings.", actor);
        return updated;
    }

    @PostMapping("/settings/reset")
    public SettingsResponseDto resetSettings(@RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        SettingsResponseDto updated = settingsService.replace(settingsService.defaultDocument());
        auditService.record("SETTINGS_RESET", "settings", "Restored the default site settings.", actor);
        return updated;
    }

    // ------------------------------------------------------------------ #
    // Conversations
    // ------------------------------------------------------------------ #

    @GetMapping("/conversations")
    public PageDto<AdminConversationDto> conversations(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
        return conversationService.list(page, size);
    }

    @GetMapping("/conversations/{id}")
    public AdminConversationDetailDto conversation(@PathVariable UUID id) {
        return conversationService.get(id);
    }

    @DeleteMapping("/conversations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(@PathVariable UUID id,
                                   @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        conversationService.delete(id);
        auditService.record("CONVERSATION_DELETE", "conversation:" + id, "Deleted a conversation.", actor);
    }

    // ------------------------------------------------------------------ #
    // AI diagnostics
    // ------------------------------------------------------------------ #

    @GetMapping("/ai/diagnostics")
    public AdminAiDiagnosticsDto aiDiagnostics() {
        return insightsService.diagnostics();
    }

    // ------------------------------------------------------------------ #
    // Audit trail
    // ------------------------------------------------------------------ #

    @GetMapping("/audit")
    public PageDto<AdminAuditEntryDto> audit(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
        return auditService.recent(page, size);
    }
}
