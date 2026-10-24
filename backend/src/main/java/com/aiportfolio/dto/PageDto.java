package com.aiportfolio.dto;

import java.util.List;

/**
 * A single page of a larger collection, shaped so the console can render
 * pagination without knowing the storage details.
 */
public record PageDto<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
    public static <T> PageDto<T> of(List<T> items, int page, int size, long totalItems) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalItems / (double) size);
        return new PageDto<>(items, page, size, totalItems, totalPages);
    }
}
