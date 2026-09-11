import http from './http';

export function fetchAuthConfig() {
  return http.get('/api/auth/config');
}

export function loginRequest(email, password) {
  return http.post('/api/auth/login', { email, password });
}

export function logoutRequest(refreshToken) {
  return http.post('/api/auth/logout', { refreshToken });
}
