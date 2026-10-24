package com.aiportfolio.controller;

import com.aiportfolio.dto.SettingsResponseDto;
import com.aiportfolio.service.SettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, unauthenticated read of the site settings.
 *
 * <p>Only the sections the browser needs are returned; the internal {@code ai}
 * section never leaves the backend.</p>
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsResponseDto getSettings() {
        return settingsService.getPublicSettings();
    }
}
