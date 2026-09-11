import http from './http';

export function listUsers({ page = 1, limit = 10, search = '', role = '' } = {}) {
  return http.get('/api/users', {
    params: {
      page,
      limit,
      search: search || undefined,
      role: role || undefined,
    },
  });
}

export function getUser(id) {
  return http.get(`/api/users/${encodeURIComponent(id)}`);
}

export function getUserUsage(id, { range = '30d' } = {}) {
  return http.get(`/api/users/${encodeURIComponent(id)}/usage`, {
    params: { range },
  });
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

export function getSsoLinkStatus() {
  return http.get('/api/users/sso/status');
}

export function getSsoRoles() {
  return http.get('/api/users/sso/roles');
}

export function getSsoEmployee(employeeNumber) {
  return http.get(`/api/users/sso/employees/${encodeURIComponent(employeeNumber)}`);
}

export function linkSsoUser(payload) {
  return http.post('/api/users/sso/link', payload);
}
