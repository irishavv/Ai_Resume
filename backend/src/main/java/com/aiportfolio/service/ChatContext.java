package com.aiportfolio.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Everything the streaming layer needs after the user message has been persisted
 * and the assistant placeholder has been created. No JPA entities escape the
 * transaction that produced this record.
 *
 * @param conversationId      owning conversation id
 * @param userMessageId       id of the persisted user message
 * @param assistantMessageId  id of the pre-created assistant placeholder
 * @param history             previous messages ({role, content}) sent to the AI service
 */
public record ChatContext(
        UUID conversationId,
        UUID userMessageId,
        UUID assistantMessageId,
        List<Map<String, String>> history
) {
}
