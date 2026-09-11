import { ref } from 'vue';
import { fetchAuthConfig, loginRequest, logoutRequest } from '../api/auth';

const requiresAuth = ref(true);
const isAuthenticated = ref(false);
const isInitializing = ref(true);
const currentUser = ref({ name: '', email: '', role: '' });
const loginEmail = ref('');
const loginPassword = ref('');
const loginError = ref('');

export function useAuth() {
  async function initialize() {
    const savedSession = localStorage.getItem('admin_session');
    if (savedSession) {
      isAuthenticated.value = true;
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        currentUser.value = JSON.parse(savedUser);
      }
    }

    try {
      const response = await fetchAuthConfig();
      requiresAuth.value = response.data.passwordRequired;
    } catch (error) {
      console.error('Error checking auth config:', error);
    } finally {
      isInitializing.value = false;
    }
  }

  async function login() {
    loginError.value = '';
    try {
      const response = await loginRequest(loginEmail.value, loginPassword.value);
      if (response.data.valid) {
        isAuthenticated.value = true;
        currentUser.value = response.data.user;
        localStorage.setItem('admin_session', 'true');
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        loginPassword.value = '';
      }
    } catch (error) {
      loginError.value = error.response?.data?.message || 'Error al iniciar sesión';
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      /* ignore logout API errors */
    }

    isAuthenticated.value = false;
    currentUser.value = { name: '', email: '', role: '' };
    localStorage.removeItem('admin_session');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    loginPassword.value = '';
  }

  return {
    requiresAuth,
    isAuthenticated,
    isInitializing,
    currentUser,
    loginEmail,
    loginPassword,
    loginError,
    initialize,
    login,
    logout,
  };
}
