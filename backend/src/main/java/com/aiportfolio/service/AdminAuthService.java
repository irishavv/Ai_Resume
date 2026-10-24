package com.aiportfolio.service;

import com.aiportfolio.config.AppProperties;
import com.aiportfolio.domain.AdminSessionEntity;
import com.aiportfolio.dto.AdminSessionDto;
import com.aiportfolio.exception.AdminAuthException;
import com.aiportfolio.repository.AdminSessionRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, validates and revokes operator console sessions.
 *
 * <p>The bearer token is a 256-bit random value that is only ever shown to the
 * client that requested it; the database stores its SHA-256 hash, so a leak of
 * the {@code admin_session} table cannot be replayed. Credential comparisons are
 * constant time.</p>
 */
@Service
public class AdminAuthService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthService.class);

    private static final int TOKEN_BYTES = 32;
    private static final int MAX_TOKEN_LENGTH = 128;
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String DEFAULT_USERNAME = "admin";

    /** Request attribute carrying the authenticated operator name. */
    public static final String ACTOR_ATTRIBUTE = "adminUsername";

    /** Request attribute carrying the authenticated session entity. */
    public static final String SESSION_ATTRIBUTE = "adminSession";

    private final AdminSessionRepository repository;
    private final AppProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminAuthService(AdminSessionRepository repository, AppProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    /**
     * @return {@code true} when a console login can succeed at all.
     */
    public boolean isEnabled() {
        return !effectivePassword().isBlank();
    }

    public String configuredUsername() {
        String username = properties.getAdmin().getUsername();
        return username == null || username.isBlank() ? DEFAULT_USERNAME : username.trim();
    }

    @Transactional
    public AdminSessionDto login(String username, String password) {
        if (!isEnabled()) {
            throw AdminAuthException.disabled();
        }
        String providedUsername = username == null ? "" : username.trim();
        String providedPassword = password == null ? "" : password;
        if (!matches(configuredUsername(), providedUsername) || !matches(effectivePassword(), providedPassword)) {
            throw AdminAuthException.invalidCredentials();
        }

        Instant now = Instant.now();
        repository.deleteExpired(now);

        byte[] random = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        Instant expiresAt = now.plus(sessionTtlMinutes(), ChronoUnit.MINUTES);

        AdminSessionEntity session = AdminSessionEntity.builder()
                .tokenHash(hash(token))
                .username(configuredUsername())
                .createdAt(now)
                .expiresAt(expiresAt)
                .lastUsedAt(now)
                .build();
        repository.save(session);

        log.info("Administrator session opened for {}", configuredUsername());
        return new AdminSessionDto(token, configuredUsername(), expiresAt);
    }

    /**
     * Resolves a bearer token to the operator that owns it, refreshing the last
     * use timestamp. Expired or unknown tokens resolve to an empty result.
     */
    @Transactional
    public Optional<AdminSessionEntity> authenticate(String token) {
        if (token == null || token.isBlank() || token.length() > MAX_TOKEN_LENGTH) {
            return Optional.empty();
        }
        Optional<AdminSessionEntity> found = repository.findByTokenHash(hash(token));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        AdminSessionEntity session = found.get();
        Instant now = Instant.now();
        if (session.isExpired(now)) {
            repository.delete(session);
            return Optional.empty();
        }
        session.setLastUsedAt(now);
        return Optional.of(repository.save(session));
    }

    /**
     * Resolves the operator name for the given raw {@code Authorization} header.
     */
    public Optional<String> resolveActor(String authorizationHeader) {
        return extractToken(authorizationHeader).flatMap(this::authenticate).map(AdminSessionEntity::getUsername);
    }

    @Transactional
    public void logout(String authorizationHeader) {
        extractToken(authorizationHeader)
                .ifPresent(token -> repository.findByTokenHash(hash(token)).ifPresent(repository::delete));
    }

    /**
     * Extracts the token from a well formed {@code Bearer <token>} header.
     */
    public static Optional<String> extractToken(String authorizationHeader) {
        if (authorizationHeader == null) {
            return Optional.empty();
        }
        String trimmed = authorizationHeader.trim();
        if (trimmed.length() <= BEARER_PREFIX.length()
                || !trimmed.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return Optional.empty();
        }
        String token = trimmed.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() || token.length() > MAX_TOKEN_LENGTH ? Optional.empty() : Optional.of(token);
    }

    private int sessionTtlMinutes() {
        int ttl = properties.getAdmin().getSessionTtlMinutes();
        return ttl <= 0 ? 480 : ttl;
    }

    private String effectivePassword() {
        String password = properties.getAdmin().getPassword();
        return password == null ? "" : password;
    }

    private static boolean matches(String expected, String provided) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                builder.append(Character.forDigit((value >> 4) & 0xF, 16));
                builder.append(Character.forDigit(value & 0xF, 16));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available in this runtime.", ex);
        }
    }
}
