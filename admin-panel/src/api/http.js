import axios from 'axios';

const http = axios.create({
  baseURL: '',
});

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const url = String(config.url || '');
    if (url.includes('/api/users/sso/')) {
      const ssoToken = localStorage.getItem('ssoAccessToken');
      if (ssoToken) {
        config.headers['X-Sso-Access-Token'] = ssoToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const url = String(originalRequest.url || '');
    const skipRefresh =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/openid/exchange') ||
      url.includes('/api/auth/openid');

    if (error.response?.status === 401 && !originalRequest._retry && !skipRefresh) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await http.post('/api/auth/refresh', { refreshToken });
          const newAccessToken = res.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return http(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('admin_session');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('ssoAccessToken');
          localStorage.removeItem('ssoIdToken');
          window.location.assign('/');
        }
      }
    }
    return Promise.reject(error);
  },
);

export default http;
