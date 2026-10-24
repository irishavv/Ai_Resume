package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.aiportfolio.config.AppProperties;
import com.aiportfolio.domain.AdminSessionEntity;
import com.aiportfolio.dto.AdminSessionDto;
import com.aiportfolio.exception.AdminAuthException;
import com.aiportfolio.repository.AdminSessionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminAuthServiceTest {

    private static final String PASSWORD = "s3cret-console";

    @Mock
    private AdminSessionRepository repository;

    private AppProperties properties;
    private AdminAuthService service;

    @BeforeEach
    void setUp() {
        properties = new AppProperties();
        properties.getAdmin().setUsername("operator");
        properties.getAdmin().setPassword(PASSWORD);
        service = new AdminAuthService(repository, properties);
        lenient().when(repository.save(any(AdminSessionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void loginIssuesATokenAndStoresOnlyItsHash() {
        AdminSessionDto session = service.login("operator", PASSWORD);

        assertThat(session.token()).isNotBlank();
        assertThat(session.username()).isEqualTo("operator");
        assertThat(session.expiresAt()).isAfter(Instant.now());

        ArgumentCaptor<AdminSessionEntity> captor = ArgumentCaptor.forClass(AdminSessionEntity.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getTokenHash())
                .hasSize(64)
                .isNotEqualTo(session.token());
    }

    @Test
    void wrongPasswordIsRejected() {
        assertThatThrownBy(() -> service.login("operator", "wrong"))
                .isInstanceOf(AdminAuthException.class)
                .satisfies(ex -> assertThat(((AdminAuthException) ex).getCode()).isEqualTo("UNAUTHORIZED"));

        verify(repository, never()).save(any(AdminSessionEntity.class));
    }

    @Test
    void loginIsDisabledWhenNoCredentialIsConfigured() {
        properties.getAdmin().setPassword("");

        assertThat(service.isEnabled()).isFalse();
        assertThatThrownBy(() -> service.login("operator", "anything"))
                .isInstanceOf(AdminAuthException.class)
                .satisfies(ex -> assertThat(((AdminAuthException) ex).getCode()).isEqualTo("ADMIN_DISABLED"));
    }

    @Test
    void aValidTokenResolvesToItsSession() {
        AdminSessionEntity stored = session(Instant.now().plus(1, ChronoUnit.HOURS));
        given(repository.findByTokenHash(any())).willReturn(Optional.of(stored));

        assertThat(service.authenticate("any-token")).isPresent();
    }

    @Test
    void anExpiredSessionIsDeletedAndRejected() {
        AdminSessionEntity expired = session(Instant.now().minus(1, ChronoUnit.MINUTES));
        given(repository.findByTokenHash(any())).willReturn(Optional.of(expired));

        assertThat(service.authenticate("any-token")).isEmpty();
        verify(repository).delete(expired);
    }

    @Test
    void logoutRevokesTheSessionMatchingTheHeader() {
        AdminSessionEntity stored = session(Instant.now().plus(1, ChronoUnit.HOURS));
        given(repository.findByTokenHash(any())).willReturn(Optional.of(stored));

        service.logout("Bearer the-token");

        verify(repository).delete(stored);
    }

    @Test
    void onlyWellFormedBearerHeadersYieldAToken() {
        assertThat(AdminAuthService.extractToken("Bearer abc")).contains("abc");
        assertThat(AdminAuthService.extractToken("bearer abc")).contains("abc");
        assertThat(AdminAuthService.extractToken("abc")).isEmpty();
        assertThat(AdminAuthService.extractToken("Bearer ")).isEmpty();
        assertThat(AdminAuthService.extractToken(null)).isEmpty();
    }

    private static AdminSessionEntity session(Instant expiresAt) {
        return AdminSessionEntity.builder()
                .id(UUID.randomUUID())
                .tokenHash("hash")
                .username("operator")
                .createdAt(Instant.now())
                .expiresAt(expiresAt)
                .lastUsedAt(Instant.now())
                .build();
    }
}
