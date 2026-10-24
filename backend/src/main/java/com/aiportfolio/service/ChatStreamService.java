package com.aiportfolio.service;

import com.aiportfolio.client.AiServiceClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;
import reactor.core.scheduler.Schedulers;

/**
 * Bridges the AI service's SSE stream to the browser's SSE stream.
 *
 * <p>The controller returns an {@link SseEmitter} immediately and the upstream
 * subscription is driven on a {@code boundedElastic} scheduler so no servlet
 * thread is ever blocked. Exactly one terminal path runs per stream (guarded by
 * a single {@link AtomicBoolean}), so a message is never left {@code STREAMING}:
 * it ends {@code COMPLETED} on a {@code done} event, or {@code FAILED} on any
 * error, timeout or client disconnect.</p>
 */
@Service
public class ChatStreamService {

    private static final Logger log = LoggerFactory.getLogger(ChatStreamService.class);
    private static final long EMITTER_TIMEOUT_MS = 180_000L;
    private static final String ERROR_CODE = "AI_SERVICE_UNAVAILABLE";
    private static final String ERROR_MESSAGE = "The AI service is currently unavailable. Please try again shortly.";

    private final ConversationService conversationService;
    private final ProfileService profileService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    public ChatStreamService(ConversationService conversationService, ProfileService profileService,
                             AiServiceClient aiServiceClient, ObjectMapper objectMapper) {
        this.conversationService = conversationService;
        this.profileService = profileService;
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Persists the exchange and starts streaming the assistant answer.
     *
     * @param language the answer language ("en" or "hi"); defaults to English
     * @throws com.aiportfolio.exception.ResourceNotFoundException if the conversation
     *         does not belong to {@code clientId}
     */
    public SseEmitter stream(UUID conversationId, String content, String clientId, String language) {
        ChatContext context = conversationService.beginExchange(conversationId, content, clientId);
        JsonNode profile = profileService.getProfileNode();
        String resolvedLanguage = language == null || language.isBlank() ? "en" : language;

        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        StringBuffer buffer = new StringBuffer();
        AtomicBoolean finalized = new AtomicBoolean(false);
        AtomicReference<Disposable> upstream = new AtomicReference<>();

        emitter.onCompletion(() -> fail(emitter, context, buffer, finalized, upstream));
        emitter.onTimeout(() -> {
            fail(emitter, context, buffer, finalized, upstream);
            safeComplete(emitter);
        });
        emitter.onError(error -> fail(emitter, context, buffer, finalized, upstream));

        boolean metaSent = trySend(emitter, "meta", Map.of(
                "conversationId", context.conversationId().toString(),
                "userMessageId", context.userMessageId().toString(),
                "assistantMessageId", context.assistantMessageId().toString()));
        if (!metaSent) {
            // The browser vanished before the stream started: persist the exchange as failed.
            if (finalized.compareAndSet(false, true)) {
                conversationService.failMessage(context.assistantMessageId(), "");
            }
            return emitter;
        }

        Disposable subscription = aiServiceClient.streamChat(profile, context.history(), content, resolvedLanguage)
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe(
                        event -> handleEvent(emitter, context, event, buffer, finalized, upstream),
                        error -> {
                            log.warn("AI chat stream failed: {}", error.getClass().getSimpleName());
                            fail(emitter, context, buffer, finalized, upstream);
                        },
                        () -> fail(emitter, context, buffer, finalized, upstream));
        upstream.set(subscription);
        if (finalized.get() && !subscription.isDisposed()) {
            subscription.dispose();
        }
        return emitter;
    }

    private void handleEvent(SseEmitter emitter, ChatContext context, ServerSentEvent<String> event,
                             StringBuffer buffer, AtomicBoolean finalized, AtomicReference<Disposable> upstream) {
        if (finalized.get()) {
            return;
        }
        String name = event.event();
        if (name == null) {
            return;
        }
        switch (name) {
            case "delta" -> {
                String text = extractText(event.data(), "text");
                if (text != null && !text.isEmpty()) {
                    buffer.append(text);
                    if (!trySend(emitter, "delta", Map.of("text", text))) {
                        fail(emitter, context, buffer, finalized, upstream);
                    }
                }
            }
            case "done" -> {
                String upstreamContent = extractText(event.data(), "content");
                String provider = extractText(event.data(), "provider");
                String finalContent = upstreamContent != null && !upstreamContent.isBlank()
                        ? upstreamContent
                        : buffer.toString();
                if (finalized.compareAndSet(false, true)) {
                    conversationService.completeMessage(context.assistantMessageId(), finalContent, provider);
                    trySend(emitter, "done", Map.of(
                            "assistantMessageId", context.assistantMessageId().toString(),
                            "content", finalContent));
                    safeComplete(emitter);
                }
            }
            case "error" -> fail(emitter, context, buffer, finalized, upstream);
            default -> {
                // Unknown event names are ignored so the protocol can grow safely.
            }
        }
    }

    /**
     * Single terminal path for every abnormal ending (upstream error, timeout,
     * client disconnect, upstream completing without a {@code done} event).
     * The accumulated partial answer is persisted with status {@code FAILED}.
     */
    private void fail(SseEmitter emitter, ChatContext context, StringBuffer buffer, AtomicBoolean finalized,
                      AtomicReference<Disposable> upstream) {
        if (finalized.compareAndSet(false, true)) {
            cancel(upstream);
            conversationService.failMessage(context.assistantMessageId(), buffer.toString());
            trySend(emitter, "error", Map.of("code", ERROR_CODE, "message", ERROR_MESSAGE));
            safeComplete(emitter);
        }
    }

    private void cancel(AtomicReference<Disposable> upstream) {
        Disposable disposable = upstream.get();
        if (disposable != null && !disposable.isDisposed()) {
            disposable.dispose();
        }
    }

    private boolean trySend(SseEmitter emitter, String event, Object payload) {
        try {
            emitter.send(SseEmitter.event().name(event).data(payload, MediaType.APPLICATION_JSON));
            return true;
        } catch (IOException | IllegalStateException ex) {
            // A failed send means the browser is gone; treated as a client disconnect.
            return false;
        }
    }

    private void safeComplete(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (IllegalStateException ignored) {
            // Already completed.
        }
    }

    private String extractText(String json, String field) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode value = node.get(field);
            if (value == null || value.isNull()) {
                return null;
            }
            return value.asText();
        } catch (JsonProcessingException ex) {
            return null;
        }
    }
}
