package com.aiportfolio.repository;

import com.aiportfolio.domain.AppSettingsEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingsRepository extends JpaRepository<AppSettingsEntity, Long> {

    Optional<AppSettingsEntity> findFirstByOrderByIdAsc();
}
