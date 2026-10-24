package com.aiportfolio.controller;

import com.aiportfolio.dto.ChatRequestDto;
import com.aiportfolio.dto.ConversationDetailDto;
import com.aiportfolio.dto.ConversationDto;
import com.aiportfolio.dto.CreateConversationRequestDto;
import com.aiportfolio.dto.MessageDto;
import com.aiportfolio.exception.RateLimitExceededException;
import com.aiportfolio.service.ChatStreamService;
import com.aiportfolio.service.ConversationService;
import com.aiportfolio.service.RateLimiter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Conversation endpoints. Every operation is scoped to the calling client via the
 * mandatory {@code X-Client-Id} header.
 */
@RestController
@RequestMapping("/api/conversations")
@Validated
public class ConversationController {

    private static final String CLIENT_ID_HEADER = "X-Client-Id";
    private static final String CLIENT_ID_PATTERN = "[A-Za-z0-9_-]+";

    private final ConversationService conversationService;
    private final ChatStreamService chatStreamService;
    private final RateLimiter rateLimiter;

    public ConversationController(ConversationService conversationService, ChatStreamService chatStreamService,
                                  RateLimiter rateLimiter) {
        this.conversationService = conversationService;
        this.chatStreamService = chatStreamService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public ResponseEntity<ConversationDto> createConversation(
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId,
            @Valid @RequestBody(required = false) CreateConversationRequestDto body) {
        String title = body == null ? null : body.title();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.createConversation(clientId, title));
    }

    @GetMapping
    public List<ConversationDto> listConversations(
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId) {
        return conversationService.listConversations(clientId);
    }

    @GetMapping("/{id}")
    public ConversationDetailDto getConversation(
            @PathVariable UUID id,
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId) {
        return conversationService.getConversation(id, clientId);
    }

    @GetMapping("/{id}/messages")
    public List<MessageDto> listMessages(
            @PathVariable UUID id,
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId) {
        return conversationService.listMessages(id, clientId);
    }

    @PostMapping(value = "/{id}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter sendMessage(
            @PathVariable UUID id,
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId,
            @Valid @RequestBody ChatRequestDto body) {
        enforceRateLimit(clientId);
        return chatStreamService.stream(id, body.content(), clientId, body.language());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(
            @PathVariable UUID id,
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId) {
        conversationService.deleteConversation(id, clientId);
    }

    @DeleteMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearMessages(
            @PathVariable UUID id,
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId) {
        conversationService.clearMessages(id, clientId);
    }

    private void enforceRateLimit(String clientId) {
        if (!rateLimiter.tryAcquire(clientId)) {
            throw new RateLimitExceededException(rateLimiter.retryAfterSeconds(clientId));
        }
    }
}
