import http from './http';

export function fetchStats() {
  return http.get('/api/stats');
}
