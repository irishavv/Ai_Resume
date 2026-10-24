package com.aiportfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/conversations/{id}/messages}.
 *
 * <p>{@code language} selects the answer language; it defaults to English when
 * omitted so existing clients keep working unchanged.</p>
 */
public record ChatRequestDto(
        @NotBlank(message = "must not be blank")
        @Size(max = 2000, message = "must be at most 2000 characters")
        String content,

        @Pattern(regexp = "en|hi", message = "must be 'en' or 'hi'")
        String language
) {
}
