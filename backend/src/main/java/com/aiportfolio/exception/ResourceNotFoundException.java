package com.aiportfolio.exception;

/**
 * Raised when a requested resource does not exist or is not visible to the caller.
 * Always mapped to HTTP 404 so other clients' data is never revealed.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
