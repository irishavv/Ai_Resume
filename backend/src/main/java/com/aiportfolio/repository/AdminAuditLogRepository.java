package com.aiportfolio.repository;

import com.aiportfolio.domain.AdminAuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLogEntity, Long> {

    Page<AdminAuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
