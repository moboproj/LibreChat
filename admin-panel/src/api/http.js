import axios from 'axios';

const http = axios.create({
  baseURL: '',
});

function isSsoUsersRoute(url = '') {
  return String(url).includes('/api/users/sso/');
}

function isSsoTokenError(error) {
  const code = error?.response?.data?.code;
  if (code === 'SSO_TOKEN_EXPIRED' || code === 'SSO_REFRESH_FAILED') return true;
  if (!isSsoUsersRoute(error?.config?.url)) return false;
  return error?.response?.status === 401;
}

async function refreshSsoAccessToken() {
  const ssoRefreshToken = localStorage.getItem('ssoRefreshToken');
  if (!ssoRefreshToken) {
    const error = new Error(
      'Token SSO expirado. Cierra sesión e inicia de nuevo para vincular usuarios.',
    );
    error.code = 'SSO_REFRESH_MISSING';
    throw error;
  }

  const res = await http.post('/api/auth/openid/refresh-sso', { ssoRefreshToken });
  if (!res.data?.ssoAccessToken) {
    throw new Error('No se pudo renovar el token SSO');
  }

  localStorage.setItem('ssoAccessToken', res.data.ssoAccessToken);
  if (res.data.ssoRefreshToken) {
    localStorage.setItem('ssoRefreshToken', res.data.ssoRefreshToken);
  }
  if (res.data.ssoIdToken) {
    localStorage.setItem('ssoIdToken', res.data.ssoIdToken);
  }
  return res.data.ssoAccessToken;
}

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const url = String(config.url || '');
    if (isSsoUsersRoute(url)) {
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
      url.includes('/api/auth/openid/refresh-sso') ||
      url.includes('/api/auth/openid');

    if (error.response?.status === 401 && isSsoUsersRoute(url) && !originalRequest._ssoRetry) {
      originalRequest._ssoRetry = true;
      try {
        const newSsoToken = await refreshSsoAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['X-Sso-Access-Token'] = newSsoToken;
        return http(originalRequest);
      } catch (ssoRefreshError) {
        const wrapped = new Error(
          ssoRefreshError?.response?.data?.message ||
            ssoRefreshError.message ||
            'Token SSO expirado. Cierra sesión e inicia de nuevo para vincular usuarios.',
        );
        wrapped.response = {
          status: 401,
          data: {
            code: 'SSO_TOKEN_EXPIRED',
            message: wrapped.message,
            error: wrapped.message,
          },
        };
        wrapped.config = originalRequest;
        return Promise.reject(wrapped);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry && !skipRefresh) {
      if (isSsoTokenError(error)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const clearAndReload = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('admin_session');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('ssoAccessToken');
        localStorage.removeItem('ssoRefreshToken');
        localStorage.removeItem('ssoIdToken');
        window.location.assign('/');
      };
      if (refreshToken) {
        try {
          const res = await http.post('/api/auth/refresh', { refreshToken });
          const newAccessToken = res.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return http(originalRequest);
        } catch {
          clearAndReload();
        }
      } else {
        clearAndReload();
      }
    }
    return Promise.reject(error);
  },
);

export default http;
