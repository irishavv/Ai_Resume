package com.aiportfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/job-match}.
 */
public record JobMatchRequestDto(
        @NotBlank(message = "must not be blank")
        @Size(min = 20, max = 20000, message = "must be between 20 and 20000 characters")
        String jobDescription
) {
}
