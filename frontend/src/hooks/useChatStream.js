import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { streamMessage } from '../services/chatService.js';
import { toApiError } from '../services/httpClient.js';
import { CONVERSATIONS_QUERY_KEY, conversationQueryKey } from './useConversations.js';
import { copy } from '../constants/copy.js';

let localSequence = 0;

function nextLocalId(prefix) {
  localSequence += 1;
  return `${prefix}-local-${Date.now().toString(36)}-${localSequence}`;
}

function findLastUserMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user' && messages[index].content) return messages[index].content;
  }
  return null;
}

function withoutTrailingFailure(messages) {
  const last = messages[messages.length - 1];
  if (last && last.role === 'assistant' && last.status === 'failed') {
    return messages.slice(0, -1);
  }
  return messages;
}

/**
 * Owns the streaming conversation state for one conversation.
 *
 * Optimistically appends the user message and an empty assistant message,
 * fills the assistant message on every `delta` frame, reconciles ids from the
 * `meta`/`done` frames, and keeps partial text when a stream is aborted.
 */
export function useChatStream({ conversationId, initialMessages = [], language = 'en' }) {
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState(() => initialMessages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const streamingRef = useRef(false);
  const localActivityRef = useRef(false);
  const lastQuestionRef = useRef(null);
  const completedOnceRef = useRef(false);

  const previousConversationRef = useRef(conversationId);

  // Re-seed from the server: a hard reset when the conversation changes, and a
  // soft sync on refetch that never clobbers a locally streamed answer.
  useEffect(() => {
    if (previousConversationRef.current !== conversationId) {
      previousConversationRef.current = conversationId;
      localActivityRef.current = false;
      completedOnceRef.current = false;
      lastQuestionRef.current = null;
      streamingRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setIsStreaming(false);
      setError(null);
      setMessages(initialMessages ?? []);
      return;
    }
    if (localActivityRef.current) return;
    setMessages(initialMessages ?? []);
  }, [conversationId, initialMessages]);

  // Abort the in-flight stream when the conversation changes or on unmount.
  useEffect(
    () => () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      streamingRef.current = false;
    },
    [conversationId],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const runStream = useCallback(
    async (question, { appendUser = true } = {}) => {
      const trimmed = String(question ?? '').trim();
      if (!trimmed || !conversationId || streamingRef.current) return;

      localActivityRef.current = true;
      lastQuestionRef.current = trimmed;

      const userLocalId = nextLocalId('user');
      const assistantLocalId = nextLocalId('assistant');
      const now = new Date().toISOString();

      setError(null);
      setMessages((prev) => {
        const withUser = appendUser
          ? [
              ...prev,
              {
                id: userLocalId,
                localId: userLocalId,
                role: 'user',
                content: trimmed,
                status: 'complete',
                createdAt: now,
              },
            ]
          : prev;

        return [
          ...withUser,
          {
            id: assistantLocalId,
            localId: assistantLocalId,
            role: 'assistant',
            content: '',
            status: 'streaming',
            createdAt: now,
          },
        ];
      });

      streamingRef.current = true;
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (updater) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.localId === assistantLocalId ? updater(message) : message,
          ),
        );
      };

      try {
        const result = await streamMessage({
          conversationId,
          content: trimmed,
          language,
          signal: controller.signal,
          onMeta: (meta) => {
            setMessages((prev) =>
              prev.map((message) => {
                if (message.localId === userLocalId && meta?.userMessageId) {
                  return { ...message, id: meta.userMessageId };
                }
                if (message.localId === assistantLocalId && meta?.assistantMessageId) {
                  return { ...message, id: meta.assistantMessageId };
                }
                return message;
              }),
            );
          },
          onDelta: (data) => {
            const text = typeof data?.text === 'string' ? data.text : '';
            if (!text) return;
            setMessages((prev) =>
              prev.map((message) =>
                message.localId === assistantLocalId
                  ? { ...message, content: message.content + text, status: 'streaming' }
                  : message,
              ),
            );
          },
          onDone: (data) => {
            patchAssistant((message) => ({
              ...message,
              id: data?.assistantMessageId || message.id,
              content:
                typeof data?.content === 'string' && data.content.length > 0
                  ? data.content
                  : message.content,
              status: 'complete',
              error: undefined,
            }));
          },
          onError: (data) => {
            const streamError = {
              code: data?.code || 'STREAM_ERROR',
              message: data?.message || copy.errors.generic,
            };
            setError(streamError);
            patchAssistant((message) => ({ ...message, status: 'failed', error: streamError }));
          },
        });

        if (result?.aborted) {
          // Cancelled by the user or by unmount: exit quietly, keeping partial text.
          setMessages((prev) =>
            prev.flatMap((message) => {
              if (message.localId !== assistantLocalId) return [message];
              if (!message.content) return [];
              return [{ ...message, status: 'stopped' }];
            }),
          );
          return;
        }

        if (result?.completed) {
          patchAssistant((message) =>
            message.status === 'streaming' ? { ...message, status: 'complete' } : message,
          );

          // Refresh the sidebar (title/ordering) on the first finished answer.
          if (!completedOnceRef.current) {
            completedOnceRef.current = true;
            queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
          }
          queryClient.invalidateQueries({ queryKey: conversationQueryKey(conversationId) });
        }
      } catch (thrown) {
        const apiError = toApiError(thrown);

        if (apiError.code === 'ABORTED') {
          setMessages((prev) =>
            prev.flatMap((message) => {
              if (message.localId !== assistantLocalId) return [message];
              if (!message.content) return [];
              return [{ ...message, status: 'stopped' }];
            }),
          );
          return;
        }

        const failure = { code: apiError.code, message: apiError.message };
        setError(failure);
        patchAssistant((message) => ({ ...message, status: 'failed', error: failure }));
      } finally {
        // Only the stream that still owns the controller may clear the flags,
        // so switching conversations mid-stream cannot cancel the new request.
        if (abortRef.current === controller) {
          streamingRef.current = false;
          abortRef.current = null;
          setIsStreaming(false);
        }
      }
    },
    [conversationId, language, queryClient],
  );

  const sendMessage = useCallback(
    (text) => runStream(text, { appendUser: true }),
    [runStream],
  );

  const retryLast = useCallback(() => {
    if (streamingRef.current) return;
    const question = lastQuestionRef.current || findLastUserMessage(messages);
    if (!question) return;
    setError(null);
    setMessages((prev) => withoutTrailingFailure(prev));
    runStream(question, { appendUser: false });
  }, [messages, runStream]);

  return { messages, isStreaming, error, sendMessage, retryLast, stop, clearError };
}

export default useChatStream;
