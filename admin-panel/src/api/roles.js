import http from './http';

export function listRoles({ page = 1, limit = 10, search = '' } = {}) {
  return http.get('/api/roles', {
    params: { page, limit, search: search || undefined },
  });
}

export function listRoleUsers(id, { page = 1, limit = 10, search = '' } = {}) {
  return http.get(`/api/roles/${encodeURIComponent(id)}/users`, {
    params: { page, limit, search: search || undefined },
  });
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
