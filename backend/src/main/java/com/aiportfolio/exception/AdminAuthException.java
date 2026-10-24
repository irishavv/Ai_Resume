package com.aiportfolio.exception;

import org.springframework.http.HttpStatus;

/**
 * Raised when the administrative surface rejects a request: a wrong credential,
 * an expired session or an installation where no credential is configured.
 */
public class AdminAuthException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private AdminAuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AdminAuthException unauthorized() {
        return new AdminAuthException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                "A valid administrator session is required.");
    }

    public static AdminAuthException invalidCredentials() {
        return new AdminAuthException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                "The administrator credentials are incorrect.");
    }

    public static AdminAuthException disabled() {
        return new AdminAuthException(HttpStatus.SERVICE_UNAVAILABLE, "ADMIN_DISABLED",
                "The administration console is disabled.");
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
