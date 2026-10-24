package com.aiportfolio.dto;

import java.util.List;

/**
 * A conversation together with its ordered messages.
 */
public record ConversationDetailDto(
        ConversationDto conversation,
        List<MessageDto> messages
) {
}
