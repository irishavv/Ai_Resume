package com.aiportfolio.repository;

import com.aiportfolio.domain.CandidateProfileEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateProfileRepository extends JpaRepository<CandidateProfileEntity, Long> {

    Optional<CandidateProfileEntity> findFirstByOrderByIdAsc();
}
