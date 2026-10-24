package com.aiportfolio.repository;

import com.aiportfolio.domain.ConversationEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    List<ConversationEntity> findByClientIdOrderByUpdatedAtDesc(String clientId);

    /**
     * Ownership-scoped lookup. A conversation is never loaded by id alone.
     */
    Optional<ConversationEntity> findByIdAndClientId(UUID id, String clientId);

    /**
     * Operator view: every conversation, newest first. Not scoped to a client id,
     * because the console is authenticated as the site owner.
     */
    Page<ConversationEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
