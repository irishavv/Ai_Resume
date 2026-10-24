import { apiRequest } from './httpClient.js';

/** GET /conversations -> ConversationDto[] */
export async function listConversations(options = {}) {
  const payload = await apiRequest('/conversations', options);
  return Array.isArray(payload) ? payload : [];
}

/** GET /conversations/{id} -> { conversation, messages } */
export async function getConversation(conversationId, options = {}) {
  if (!conversationId) return { conversation: null, messages: [] };
  const payload = await apiRequest(`/conversations/${encodeURIComponent(conversationId)}`, options);
  return {
    conversation: payload?.conversation ?? null,
    messages: Array.isArray(payload?.messages) ? payload.messages : [],
  };
}

/** POST /conversations -> ConversationDto */
export async function createConversation({ title } = {}, options = {}) {
  const body = title ? { title } : {};
  return apiRequest('/conversations', { ...options, method: 'POST', body });
}

/** DELETE /conversations/{id} -> 204 */
export async function deleteConversation(conversationId, options = {}) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
    ...options,
    method: 'DELETE',
  });
}

/** DELETE /conversations/{id}/messages -> 204 */
export async function clearMessages(conversationId, options = {}) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    ...options,
    method: 'DELETE',
  });
}

export default {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  clearMessages,
};
