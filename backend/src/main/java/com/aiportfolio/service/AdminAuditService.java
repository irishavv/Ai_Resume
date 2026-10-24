package com.aiportfolio.service;

import com.aiportfolio.domain.AdminAuditLogEntity;
import com.aiportfolio.dto.AdminAuditEntryDto;
import com.aiportfolio.dto.PageDto;
import com.aiportfolio.repository.AdminAuditLogRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records and reads the administrative audit trail.
 *
 * <p>Only a short human readable summary is stored, never a previous payload, so
 * the log can be shown in the console without exposing profile content.</p>
 */
@Service
public class AdminAuditService {

    private static final int MAX_ACTION_LENGTH = 48;
    private static final int MAX_TARGET_LENGTH = 96;
    private static final int MAX_ACTOR_LENGTH = 64;

    private final AdminAuditLogRepository repository;

    public AdminAuditService(AdminAuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(String action, String target, String summary, String actor) {
        repository.save(AdminAuditLogEntity.builder()
                .action(truncate(action, MAX_ACTION_LENGTH))
                .target(truncate(target, MAX_TARGET_LENGTH))
                .summary(blankToDefault(summary, "-"))
                .actor(truncate(blankToDefault(actor, "unknown"), MAX_ACTOR_LENGTH))
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public PageDto<AdminAuditEntryDto> recent(int page, int size) {
        Page<AdminAuditLogEntity> result = repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        List<AdminAuditEntryDto> items = result.getContent().stream()
                .map(AdminAuditService::toDto)
                .toList();
        return PageDto.of(items, page, size, result.getTotalElements());
    }

    private static AdminAuditEntryDto toDto(AdminAuditLogEntity entity) {
        return new AdminAuditEntryDto(
                entity.getId(),
                entity.getAction(),
                entity.getTarget(),
                entity.getSummary(),
                entity.getActor(),
                entity.getCreatedAt());
    }

    private static String truncate(String value, int maxLength) {
        String safe = value == null ? "" : value.trim();
        return safe.length() <= maxLength ? safe : safe.substring(0, maxLength);
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
