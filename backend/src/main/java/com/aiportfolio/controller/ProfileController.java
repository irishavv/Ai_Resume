package com.aiportfolio.controller;

import com.aiportfolio.dto.ProfileResponseDto;
import com.aiportfolio.service.ProfileService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only public profile access. Writes live on the operator console
 * ({@code PUT /api/admin/profile}) behind the session guard.
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponseDto getProfile() {
        return profileService.getProfile();
    }

    @GetMapping("/projects")
    public JsonNode getProjects() {
        return profileService.getSection("projects");
    }

    @GetMapping("/skills")
    public JsonNode getSkills() {
        return profileService.getSection("skills");
    }

    @GetMapping("/education")
    public JsonNode getEducation() {
        return profileService.getSection("education");
    }

    @GetMapping("/links")
    public JsonNode getLinks() {
        return profileService.getSection("links");
    }
}
