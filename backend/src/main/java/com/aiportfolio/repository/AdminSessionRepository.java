package com.aiportfolio.repository;

import com.aiportfolio.domain.AdminSessionEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminSessionRepository extends JpaRepository<AdminSessionEntity, UUID> {

    Optional<AdminSessionEntity> findByTokenHash(String tokenHash);

    @Modifying
    @Query("delete from AdminSessionEntity session where session.expiresAt <= :reference")
    int deleteExpired(@Param("reference") Instant reference);
}
