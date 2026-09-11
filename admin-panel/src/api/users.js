import http from './http';

export function listUsers(limit = 100) {
  return http.get('/api/users', { params: { limit } });
}

export function createUser(payload) {
  return http.post('/api/users', payload);
}

export function updateUser(id, payload) {
  return http.put(`/api/users/${id}`, payload);
}

export function updateUserPassword(id, password) {
  return http.put(`/api/users/${id}/password`, { password });
}

export function deleteUser(id) {
  return http.delete(`/api/users/${id}`);
}
