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
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/auth/login' &&
      originalRequest.url !== '/api/auth/refresh'
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await http.post('/api/auth/refresh', { refreshToken });
          const newAccessToken = res.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return http(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('admin_session');
          localStorage.removeItem('currentUser');
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  },
);

export default http;
