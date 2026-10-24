package com.aiportfolio.exception;

import com.aiportfolio.dto.ApiErrorBody;
import com.aiportfolio.dto.ApiErrorDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates every uncaught exception into the standard error envelope:
 * {@code {"error": {"code", "message", "timestamp", "path"}}}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorDto> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                   HttpServletRequest request) {
        List<String> problems = ex.getBindingResult().getAllErrors().stream()
                .map(error -> {
                    String field = error instanceof org.springframework.validation.FieldError fieldError
                            ? fieldError.getField() : "request";
                    return field + " " + error.getDefaultMessage();
                })
                .toList();
        return validationError(problems, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorDto> handleConstraintViolation(ConstraintViolationException ex,
                                                                 HttpServletRequest request) {
        List<String> problems = ex.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + " " + violation.getMessage())
                .toList();
        return validationError(problems, request);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiErrorDto> handleHandlerMethodValidation(HandlerMethodValidationException ex,
                                                                     HttpServletRequest request) {
        return validationError(List.of("Request validation failed."), request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MissingRequestHeaderException.class})
    public ResponseEntity<ApiErrorDto> handleUnreadableRequest(Exception ex, HttpServletRequest request) {
        return validationError(List.of("Request body is missing or malformed."), request);
    }

    @ExceptionHandler(InvalidProfileException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidProfile(InvalidProfileException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", String.join("; ", ex.getProblems()), request);
    }

    @ExceptionHandler(InvalidSettingsException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidSettings(InvalidSettingsException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", String.join("; ", ex.getProblems()), request);
    }

    @ExceptionHandler(AdminAuthException.class)
    public ResponseEntity<ApiErrorDto> handleAdminAuth(AdminAuthException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidResumeException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidResume(InvalidResumeException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler({MaxUploadSizeExceededException.class, MultipartException.class})
    public ResponseEntity<ApiErrorDto> handleMultipart(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE",
                "The uploaded file exceeds the maximum allowed size.", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorDto> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex,
                                                                  HttpServletRequest request) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "The request content type is not supported.", request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorDto> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ApiErrorDto> handleNoResource(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", "The requested resource was not found.", request);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiErrorDto> handleRateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        ApiErrorDto body = envelope("RATE_LIMITED", ex.getMessage(), request);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Long.toString(ex.getRetryAfterSeconds()))
                .body(body);
    }

    @ExceptionHandler(AiServiceUnavailableException.class)
    public ResponseEntity<ApiErrorDto> handleAiUnavailable(AiServiceUnavailableException ex,
                                                           HttpServletRequest request) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE",
                "The AI service is currently unavailable. Please try again shortly.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorDto> handleUnexpected(Exception ex, HttpServletRequest request,
                                                        HttpServletResponse response) {
        if (isCommittedStream(response)) {
            // The response has already started (an SSE stream). The error envelope
            // cannot be written onto it, and a disconnect mid-stream is a normal
            // client event rather than a server fault.
            log.debug("Client disconnected during stream for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), ex.getMessage());
            return null;
        }
        log.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred.", request);
    }

    /**
     * {@code true} when the response has already been committed or is an event
     * stream, meaning the standard JSON error envelope can no longer be written.
     */
    private boolean isCommittedStream(HttpServletResponse response) {
        if (response.isCommitted()) {
            return true;
        }
        String contentType = response.getContentType();
        return contentType != null && contentType.startsWith(MediaType.TEXT_EVENT_STREAM_VALUE);
    }

    private ResponseEntity<ApiErrorDto> validationError(List<String> problems, HttpServletRequest request) {
        String message = problems.isEmpty() ? "Request validation failed." : String.join("; ", problems);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    private ResponseEntity<ApiErrorDto> build(HttpStatus status, String code, String message,
                                              HttpServletRequest request) {
        return ResponseEntity.status(status).body(envelope(code, message, request));
    }

    private ApiErrorDto envelope(String code, String message, HttpServletRequest request) {
        return new ApiErrorDto(new ApiErrorBody(code, message, Instant.now(), request.getRequestURI()));
    }
}
