import http from './http';

export function listAgents({ page = 1, limit = 10, search = '', mcp = '' } = {}) {
  return http.get('/api/agents', {
    params: {
      page,
      limit,
      search: search || undefined,
      mcp: mcp || undefined,
    },
  });
}

export function getAgent(id) {
  return http.get(`/api/agents/${encodeURIComponent(id)}`);
}

export function createAgent(payload) {
  return http.post('/api/agents', payload);
}

export function updateAgent(id, payload) {
  return http.put(`/api/agents/${encodeURIComponent(id)}`, payload);
}

export function deleteAgent(id) {
  return http.delete(`/api/agents/${encodeURIComponent(id)}`);
}
