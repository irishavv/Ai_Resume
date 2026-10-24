package com.aiportfolio.service;

import com.aiportfolio.domain.ConversationEntity;
import com.aiportfolio.domain.MessageEntity;
import com.aiportfolio.domain.MessageStatus;
import com.aiportfolio.domain.Role;
import com.aiportfolio.dto.ConversationDetailDto;
import com.aiportfolio.dto.ConversationDto;
import com.aiportfolio.dto.MessageDto;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.ConversationRepository;
import com.aiportfolio.repository.MessageRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Conversation and message persistence.
 *
 * <p>Every lookup is scoped to the calling client id so one browser can never
 * address another browser's conversation: a mismatch is reported as 404, never
 * as 403.</p>
 */
@Service
public class ConversationService {

    private static final int TITLE_LENGTH = 60;
    private static final int MAX_TITLE_LENGTH = 200;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final RuntimeSettings runtimeSettings;

    public ConversationService(ConversationRepository conversationRepository,
                               MessageRepository messageRepository,
                               RuntimeSettings runtimeSettings) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.runtimeSettings = runtimeSettings;
    }

    @Transactional
    public ConversationDto createConversation(String clientId, String title) {
        Instant now = Instant.now();
        ConversationEntity conversation = ConversationEntity.builder()
                .clientId(clientId)
                .title(normalizeTitle(title, MAX_TITLE_LENGTH))
                .createdAt(now)
                .updatedAt(now)
                .messages(new ArrayList<>())
                .build();
        ConversationEntity saved = conversationRepository.save(conversation);
        return toDto(saved, 0L);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations(String clientId) {
        return conversationRepository.findByClientIdOrderByUpdatedAtDesc(clientId).stream()
                .map(conversation -> toDto(conversation, messageRepository.countByConversationId(conversation.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ConversationDetailDto getConversation(UUID conversationId, String clientId) {
        ConversationEntity conversation = requireOwned(conversationId, clientId);
        List<MessageDto> messages = conversation.getMessages().stream()
                .sorted((left, right) -> left.getCreatedAt().compareTo(right.getCreatedAt()))
                .map(ConversationService::toDto)
                .toList();
        return new ConversationDetailDto(toDto(conversation, messages.size()), messages);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> listMessages(UUID conversationId, String clientId) {
        ConversationEntity conversation = requireOwned(conversationId, clientId);
        return conversation.getMessages().stream()
                .sorted((left, right) -> left.getCreatedAt().compareTo(right.getCreatedAt()))
                .map(ConversationService::toDto)
                .toList();
    }

    @Transactional
    public void deleteConversation(UUID conversationId, String clientId) {
        ConversationEntity conversation = requireOwned(conversationId, clientId);
        conversationRepository.delete(conversation);
    }

    @Transactional
    public void clearMessages(UUID conversationId, String clientId) {
        ConversationEntity conversation = requireOwned(conversationId, clientId);
        conversation.getMessages().clear();
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
    }

    /**
     * Persists the user message, creates the assistant placeholder and returns the
     * history to replay. Runs in its own short transaction: the long-lived stream
     * never holds a database connection.
     */
    @Transactional
    public ChatContext beginExchange(UUID conversationId, String content, String clientId) {
        ConversationEntity conversation = requireOwned(conversationId, clientId);
        Instant now = Instant.now();

        List<MessageEntity> existing = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<Map<String, String>> history = buildHistory(existing);

        MessageEntity userMessage = MessageEntity.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .role(Role.USER)
                .content(content)
                .status(MessageStatus.COMPLETED)
                .createdAt(now)
                .build();
        messageRepository.save(userMessage);

        MessageEntity assistantMessage = MessageEntity.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .role(Role.ASSISTANT)
                .content("")
                .status(MessageStatus.STREAMING)
                .createdAt(now)
                .build();
        messageRepository.save(assistantMessage);

        if (conversation.getTitle() == null || conversation.getTitle().isBlank()) {
            conversation.setTitle(normalizeTitle(content, TITLE_LENGTH));
        }
        conversation.setUpdatedAt(now);
        conversationRepository.save(conversation);

        return new ChatContext(conversation.getId(), userMessage.getId(), assistantMessage.getId(), history);
    }

    @Transactional
    public void completeMessage(UUID messageId, String content, String provider) {
        messageRepository.findById(messageId).ifPresent(message -> {
            if (message.getStatus() == MessageStatus.COMPLETED) {
                return;
            }
            message.setContent(content == null ? "" : content);
            message.setStatus(MessageStatus.COMPLETED);
            if (provider != null && !provider.isBlank()) {
                message.setProvider(provider);
            }
            messageRepository.save(message);
            touchConversation(message);
        });
    }

    @Transactional
    public void failMessage(UUID messageId, String partialContent) {
        messageRepository.findById(messageId).ifPresent(message -> {
            if (message.getStatus() != MessageStatus.STREAMING) {
                return;
            }
            message.setContent(partialContent == null ? "" : partialContent);
            message.setStatus(MessageStatus.FAILED);
            messageRepository.save(message);
            touchConversation(message);
        });
    }

    private void touchConversation(MessageEntity message) {
        ConversationEntity conversation = message.getConversation();
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
    }

    private List<Map<String, String>> buildHistory(List<MessageEntity> existing) {
        List<MessageEntity> eligible = existing.stream()
                .filter(message -> message.getContent() != null && !message.getContent().isBlank())
                .filter(message -> message.getStatus() != MessageStatus.STREAMING)
                .toList();
        int historyLimit = runtimeSettings.getChatHistoryLimit();
        int fromIndex = Math.max(0, eligible.size() - historyLimit);
        List<Map<String, String>> history = new ArrayList<>();
        for (MessageEntity message : eligible.subList(fromIndex, eligible.size())) {
            history.add(Map.of(
                    "role", message.getRole() == Role.USER ? "user" : "assistant",
                    "content", message.getContent()));
        }
        return history;
    }

    private ConversationEntity requireOwned(UUID conversationId, String clientId) {
        return conversationRepository.findByIdAndClientId(conversationId, clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found."));
    }

    private static String normalizeTitle(String title, int maxLength) {
        if (title == null) {
            return null;
        }
        String trimmed = title.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private static ConversationDto toDto(ConversationEntity conversation, long messageCount) {
        return new ConversationDto(
                conversation.getId(),
                conversation.getTitle(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt(),
                (int) messageCount);
    }

    private static MessageDto toDto(MessageEntity message) {
        return new MessageDto(
                message.getId(),
                message.getRole() == Role.USER ? "user" : "assistant",
                message.getContent(),
                message.getStatus().name().toLowerCase(java.util.Locale.ROOT),
                message.getCreatedAt());
    }
}
