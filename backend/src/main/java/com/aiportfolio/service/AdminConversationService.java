package com.aiportfolio.service;

import com.aiportfolio.domain.ConversationEntity;
import com.aiportfolio.domain.MessageEntity;
import com.aiportfolio.domain.Role;
import com.aiportfolio.dto.AdminConversationDetailDto;
import com.aiportfolio.dto.AdminConversationDto;
import com.aiportfolio.dto.MessageDto;
import com.aiportfolio.dto.PageDto;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.ConversationRepository;
import com.aiportfolio.repository.MessageRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Operator-facing conversation management.
 *
 * <p>Unlike the client facing service these lookups are deliberately not scoped
 * to a client id: the console is authenticated as the site owner, so support can
 * inspect and remove any conversation. The owning client id is included in the
 * listing so a report can be traced back to a browser.</p>
 */
@Service
public class AdminConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public AdminConversationService(ConversationRepository conversationRepository,
                                    MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional(readOnly = true)
    public PageDto<AdminConversationDto> list(int page, int size) {
        Page<ConversationEntity> result =
                conversationRepository.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size));
        List<AdminConversationDto> items = result.getContent().stream()
                .map(conversation -> new AdminConversationDto(
                        conversation.getId(),
                        conversation.getClientId(),
                        conversation.getTitle(),
                        conversation.getCreatedAt(),
                        conversation.getUpdatedAt(),
                        messageRepository.countByConversationId(conversation.getId())))
                .toList();
        return PageDto.of(items, page, size, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminConversationDetailDto get(UUID conversationId) {
        ConversationEntity conversation = require(conversationId);
        List<MessageDto> messages = conversation.getMessages().stream()
                .sorted(Comparator.comparing(MessageEntity::getCreatedAt))
                .map(AdminConversationService::toDto)
                .toList();
        AdminConversationDto summary = new AdminConversationDto(
                conversation.getId(),
                conversation.getClientId(),
                conversation.getTitle(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt(),
                messages.size());
        return new AdminConversationDetailDto(summary, messages);
    }

    @Transactional
    public void delete(UUID conversationId) {
        conversationRepository.delete(require(conversationId));
    }

    private ConversationEntity require(UUID conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found."));
    }

    private static MessageDto toDto(MessageEntity message) {
        return new MessageDto(
                message.getId(),
                message.getRole() == Role.USER ? "user" : "assistant",
                message.getContent(),
                message.getStatus().name().toLowerCase(Locale.ROOT),
                message.getCreatedAt());
    }
}
