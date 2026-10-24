package com.aiportfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/admin/session}.
 */
public record AdminLoginRequestDto(
        @NotBlank(message = "must not be blank")
        @Size(max = 64, message = "must be at most 64 characters")
        String username,
        @NotBlank(message = "must not be blank")
        @Size(max = 128, message = "must be at most 128 characters")
        String password
) {
}
