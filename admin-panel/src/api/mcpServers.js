import http from './http';

export function listMcpServers(limit = 100) {
  return http.get('/api/mcpservers', { params: { limit } });
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
