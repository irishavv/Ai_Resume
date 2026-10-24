package com.aiportfolio.security;

import com.aiportfolio.domain.AdminSessionEntity;
import com.aiportfolio.dto.ApiErrorBody;
import com.aiportfolio.dto.ApiErrorDto;
import com.aiportfolio.exception.AdminAuthException;
import com.aiportfolio.service.AdminAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Guards {@code /api/admin/**} with an operator session.
 *
 * <p>{@code POST /api/admin/session} (the login itself) is the single exempt
 * route. Every other call needs a valid {@code Authorization: Bearer <token>}
 * header whose session is still inside its time to live. A request is rejected
 * with the standard error envelope, never with an HTML error page.</p>
 */
@Component
public class AdminSessionFilter extends OncePerRequestFilter {

    private static final String ADMIN_PREFIX = "/api/admin";
    private static final String SESSION_PATH = "/api/admin/session";
    private static final String AUTHORIZATION_HEADER = "Authorization";

    private final AdminAuthService authService;
    private final ObjectMapper objectMapper;

    public AdminSessionFilter(AdminAuthService authService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || !uri.startsWith(ADMIN_PREFIX)) {
            return true;
        }
        // The login route authenticates by body, not by session.
        return HttpMethod.POST.matches(request.getMethod()) && SESSION_PATH.equals(uri);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!authService.isEnabled()) {
            writeError(response, request, AdminAuthException.disabled());
            return;
        }

        Optional<AdminSessionEntity> session =
                AdminAuthService.extractToken(request.getHeader(AUTHORIZATION_HEADER))
                        .flatMap(authService::authenticate);
        if (session.isEmpty()) {
            writeError(response, request, AdminAuthException.unauthorized());
            return;
        }

        request.setAttribute(AdminAuthService.ACTOR_ATTRIBUTE, session.get().getUsername());
        request.setAttribute(AdminAuthService.SESSION_ATTRIBUTE, session.get());
        filterChain.doFilter(request, response);
    }

    private void writeError(HttpServletResponse response, HttpServletRequest request, AdminAuthException ex)
            throws IOException {
        response.setStatus(ex.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiErrorDto body = new ApiErrorDto(
                new ApiErrorBody(ex.getCode(), ex.getMessage(), Instant.now(), request.getRequestURI()));
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
