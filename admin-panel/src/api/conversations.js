import http from './http';

export function listConversations({ page = 1, limit = 10, search = '', user = '' } = {}) {
  return http.get('/api/conversations', {
    params: {
      page,
      limit,
      search: search || undefined,
      user: user || undefined,
    },
  });
}

export function getConversation(id) {
  return http.get(`/api/conversations/${encodeURIComponent(id)}`);
}

export function listMessages({
  page = 1,
  limit = 10,
  search = '',
  conversationId = '',
  user = '',
} = {}) {
  return http.get('/api/messages', {
    params: {
      page,
      limit,
      search: search || undefined,
      conversationId: conversationId || undefined,
      user: user || undefined,
    },
  });
}
