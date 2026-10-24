import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getConversation } from '../services/conversationService.js';
import { conversationQueryKey } from './useConversations.js';

/** Normalises a server message into the shape the UI renders. */
export function normalizeMessage(message) {
  if (!message) return null;
  const status = message.status || 'complete';
  const failed = status === 'failed' || status === 'error';
  return {
    id: message.id,
    localId: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content: typeof message.content === 'string' ? message.content : '',
    status: failed ? 'failed' : 'complete',
    createdAt: message.createdAt ?? null,
  };
}

/**
 * Loads a single conversation together with its messages.
 * Pass `null` to stay idle (no conversation selected).
 */
export function useConversation(conversationId) {
  const query = useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: ({ signal }) => getConversation(conversationId, { signal }),
    enabled: Boolean(conversationId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const messages = useMemo(
    () => (query.data?.messages ?? []).map(normalizeMessage).filter(Boolean),
    [query.data],
  );

  return {
    conversation: query.data?.conversation ?? null,
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useConversation;
