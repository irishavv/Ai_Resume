package com.aiportfolio.controller;

import com.aiportfolio.domain.AdminSessionEntity;
import com.aiportfolio.dto.AdminLoginRequestDto;
import com.aiportfolio.dto.AdminSessionDto;
import com.aiportfolio.dto.AdminSessionInfoDto;
import com.aiportfolio.service.AdminAuditService;
import com.aiportfolio.service.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Operator console session endpoints.
 *
 * <p>{@code POST} is the login route and is the only path exempt from the
 * session filter. {@code GET} and {@code DELETE} are reached only with a valid
 * {@code Authorization: Bearer <token>} header, which the filter has already
 * verified by the time these methods run.</p>
 */
@RestController
@RequestMapping("/api/admin/session")
public class AdminSessionController {

    private static final String AUTHORIZATION_HEADER = "Authorization";

    private final AdminAuthService authService;
    private final AdminAuditService auditService;

    public AdminSessionController(AdminAuthService authService, AdminAuditService auditService) {
        this.authService = authService;
        this.auditService = auditService;
    }

    @PostMapping
    public AdminSessionDto login(@Valid @RequestBody AdminLoginRequestDto body) {
        AdminSessionDto session = authService.login(body.username(), body.password());
        auditService.record("SESSION_OPEN", "session", "Operator signed in.", session.username());
        return session;
    }

    @GetMapping
    public AdminSessionInfoDto current(
            @RequestAttribute(AdminAuthService.SESSION_ATTRIBUTE) AdminSessionEntity session) {
        return new AdminSessionInfoDto(session.getUsername(), session.getExpiresAt());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(AUTHORIZATION_HEADER) String authorization,
                       @RequestAttribute(AdminAuthService.ACTOR_ATTRIBUTE) String actor) {
        auditService.record("SESSION_CLOSE", "session", "Operator signed out.", actor);
        authService.logout(authorization);
    }
}
