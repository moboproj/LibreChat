import http from './http';

export function fetchAgentOptions() {
  return http.get('/api/catalog/agent-options');
}
