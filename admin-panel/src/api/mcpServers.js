import http from './http';

export function listMcpServers({ page = 1, limit = 10, search = '' } = {}) {
  return http.get('/api/mcpservers', {
    params: { page, limit, search: search || undefined },
  });
}

export function getMcpServer(id) {
  return http.get(`/api/mcpservers/${encodeURIComponent(id)}`);
}

export function createMcpServer(payload) {
  return http.post('/api/mcpservers', payload);
}

export function updateMcpServer(id, payload) {
  return http.put(`/api/mcpservers/${id}`, payload);
}

export function deleteMcpServer(id) {
  return http.delete(`/api/mcpservers/${id}`);
}
