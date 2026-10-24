package com.aiportfolio.dto;

/**
 * Standard error envelope: {@code {"error": {...}}}.
 */
public record ApiErrorDto(ApiErrorBody error) {
}
