import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  deleteConversation,
  listConversations,
} from '../services/conversationService.js';

export const CONVERSATIONS_QUERY_KEY = ['conversations'];
export const conversationQueryKey = (conversationId) => ['conversation', conversationId];

function timestampOf(conversation) {
  const value = conversation?.updatedAt || conversation?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function sortConversations(conversations) {
  return [...conversations].sort((a, b) => timestampOf(b) - timestampOf(a));
}

/**
 * Conversation list plus the create / delete mutations.
 * Every mutation invalidates the affected caches so the sidebar stays accurate.
 */
export function useConversations() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: ({ signal }) => listConversations({ signal }),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (variables = {}) => createConversation(variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId) => deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({ queryKey: conversationQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });

  const conversations = useMemo(() => sortConversations(listQuery.data ?? []), [listQuery.data]);

  return {
    conversations,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    create: createMutation,
    remove: deleteMutation,
  };
}

export default useConversations;
