package com.aiportfolio.exception;

import org.springframework.http.HttpStatus;

/**
 * Raised when an uploaded resume fails validation before it is forwarded to the
 * AI service. Carries the HTTP status and error code to return to the client.
 */
public class InvalidResumeException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public InvalidResumeException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
