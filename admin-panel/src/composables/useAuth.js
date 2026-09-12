import { ref } from 'vue';
import { fetchAuthConfig, logoutRequest, exchangeOpenIdCode } from '../api/auth';
import http from '../api/http';

const requiresAuth = ref(true);
const isAuthenticated = ref(false);
const isInitializing = ref(true);
const isRedirectingToSso = ref(false);
const currentUser = ref({ name: '', email: '', role: '' });
const loginError = ref('');
const openidEnabled = ref(false);
const openidButtonLabel = ref('Iniciar sesión con SSO');

function persistSession({ accessToken, refreshToken, user, ssoAccessToken, ssoIdToken }) {
  isAuthenticated.value = true;
  currentUser.value = user;
  localStorage.setItem('admin_session', 'true');
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('currentUser', JSON.stringify(user));
  if (ssoAccessToken) {
    localStorage.setItem('ssoAccessToken', ssoAccessToken);
  } else {
    localStorage.removeItem('ssoAccessToken');
  }
  if (ssoIdToken) {
    localStorage.setItem('ssoIdToken', ssoIdToken);
  } else {
    localStorage.removeItem('ssoIdToken');
  }
}

function clearSession() {
  isAuthenticated.value = false;
  currentUser.value = { name: '', email: '', role: '' };
  localStorage.removeItem('admin_session');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('ssoAccessToken');
  localStorage.removeItem('ssoIdToken');
}

export function useAuth() {
  async function initialize() {
    const accessToken = localStorage.getItem('accessToken');
    const savedSession = localStorage.getItem('admin_session');
    // Sesión válida solo con ambos; si falta uno, limpiar huérfanos y forzar SSO.
    if (savedSession && accessToken) {
      isAuthenticated.value = true;
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          currentUser.value = JSON.parse(savedUser);
        } catch {
          clearSession();
        }
      }
    } else if (savedSession || accessToken) {
      clearSession();
    }

    try {
      const response = await fetchAuthConfig();
      requiresAuth.value = true;
      openidEnabled.value = Boolean(response.data.openidEnabled);
      if (response.data.openidButtonLabel) {
        openidButtonLabel.value = response.data.openidButtonLabel;
      }
    } catch (error) {
      console.error('Error checking auth config:', error);
    } finally {
      isInitializing.value = false;
    }
  }

  function startOpenIdLogin() {
    isRedirectingToSso.value = true;
    window.location.replace('/api/auth/openid');
  }

  async function completeOpenIdLogin(code) {
    const response = await exchangeOpenIdCode(code);
    if (!response.data.valid) {
      throw new Error(response.data.message || 'Intercambio OpenID fallido');
    }
    persistSession({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
      ssoAccessToken: response.data.ssoAccessToken,
      ssoIdToken: response.data.ssoIdToken,
    });
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    const ssoIdToken = localStorage.getItem('ssoIdToken');
    const logoutHint = currentUser.value?.email || '';

    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      /* ignore */
    }

    clearSession();
    isRedirectingToSso.value = false;

    if (!openidEnabled.value) {
      window.location.replace('/api/auth/openid');
      return;
    }

    try {
      const { data } = await http.post(
        '/api/auth/openid/logout',
        {
          id_token_hint: ssoIdToken || undefined,
          logout_hint: logoutHint || undefined,
        },
        { headers: { Accept: 'application/json' } },
      );

      if (data?.redirect) {
        window.location.replace(data.redirect);
        return;
      }
    } catch (error) {
      console.error('SSO logout failed:', error);
    }

    // Fallback: reiniciar OIDC → pantalla de login Keycloak
    window.location.replace('/api/auth/openid');
  }

  return {
    requiresAuth,
    isAuthenticated,
    isInitializing,
    isRedirectingToSso,
    currentUser,
    loginError,
    openidEnabled,
    openidButtonLabel,
    initialize,
    startOpenIdLogin,
    completeOpenIdLogin,
    logout,
  };
}
