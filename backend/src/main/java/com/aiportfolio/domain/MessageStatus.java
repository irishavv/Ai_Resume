package com.aiportfolio.domain;

/**
 * Lifecycle state of a conversation message.
 *
 * <p>A message is never left in {@link #STREAMING}: every stream terminates by
 * moving the assistant message to {@link #COMPLETED} or {@link #FAILED}.</p>
 */
public enum MessageStatus {
    STREAMING,
    COMPLETED,
    FAILED
}
