package com.aiportfolio.dto;

import jakarta.validation.constraints.Size;

/**
 * Optional body of {@code POST /api/conversations}.
 */
public record CreateConversationRequestDto(
        @Size(max = 200, message = "must be at most 200 characters")
        String title
) {
}
