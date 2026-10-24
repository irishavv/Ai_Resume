package com.aiportfolio.dto;

import java.util.List;

/**
 * An operator-facing conversation together with its ordered messages.
 */
public record AdminConversationDetailDto(
        AdminConversationDto conversation,
        List<MessageDto> messages
) {
}
