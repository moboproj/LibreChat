import http from './http';

export function listRoles(limit = 100) {
  return http.get('/api/roles', { params: { limit } });
}

export function createRole(payload) {
  return http.post('/api/roles', payload);
}

export function updateRole(id, payload) {
  return http.put(`/api/roles/${id}`, payload);
}

export function deleteRole(id) {
  return http.delete(`/api/roles/${id}`);
}
