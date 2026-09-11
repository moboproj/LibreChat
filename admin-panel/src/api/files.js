import http from './http';

export function listFiles({ page = 1, limit = 10, search = '', user = '' } = {}) {
  return http.get('/api/files', {
    params: {
      page,
      limit,
      search: search || undefined,
      user: user || undefined,
    },
  });
}

export function getFile(id) {
  return http.get(`/api/files/${encodeURIComponent(id)}`);
}
