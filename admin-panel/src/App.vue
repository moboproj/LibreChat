<template>
  <div class="flex min-h-screen overflow-x-hidden" style="background: var(--app-bg)">
    <FeedbackModal />

    <LoadingOverlay v-if="isInitializing && !isAuthCallbackRoute && !isRedirectingToSso" />

    <div
      v-else-if="isRedirectingToSso && !isAuthCallbackRoute"
      class="min-h-screen"
      style="background: var(--app-bg)"
    />

    <router-view v-else-if="isAuthCallbackRoute" />

    <LoginForm
      v-else-if="requiresAuth && !isAuthenticated && !openidEnabled"
      :error="loginError || 'SSO no está configurado'"
      :openid-enabled="false"
      :openid-button-label="openidButtonLabel"
    />

    <template v-else-if="isAuthenticated">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-30 bg-black/50 md:hidden"
        aria-hidden="true"
        @click="closeMobile"
      />

      <AppSidebar
        :items="navItems"
        :user="currentUser"
        @logout="logout"
      />

      <div
        class="app-main flex min-h-screen flex-1 flex-col transition-[margin,width] duration-200"
        :style="mainStyle"
      >
        <header
          class="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b px-3 backdrop-blur-md sm:px-6"
          style="
            border-color: var(--border);
            background: rgba(33, 33, 33, 0.85);
          "
        >
          <div class="flex min-w-0 items-center gap-2">
            <button
              type="button"
              class="ui-btn-ghost px-2 py-1 md:hidden"
              title="Abrir menú"
              aria-label="Abrir menú"
              @click="openMobile"
            >
              ☰
            </button>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Admin
              </p>
              <h1 class="truncate text-sm font-semibold text-[var(--text)] sm:text-base">
                {{ pageTitle }}
              </h1>
            </div>
          </div>
        </header>
        <main class="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
          <router-view />
        </main>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './composables/useAuth';
import { useSidebar } from './composables/useSidebar';
import LoginForm from './components/presentational/LoginForm.vue';
import AppSidebar from './components/presentational/AppSidebar.vue';
import LoadingOverlay from './components/presentational/LoadingOverlay.vue';
import FeedbackModal from './components/ui/FeedbackModal.vue';

const route = useRoute();
const { collapsed, mobileOpen, openMobile, closeMobile } = useSidebar();
const {
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
  logout,
} = useAuth();

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◫' },
  { path: '/statistics', label: 'Estadísticas', icon: '▦' },
  { path: '/usage', label: 'Uso / Tokens', icon: '▣' },
  { path: '/users', label: 'Usuarios', icon: '☺' },
  { path: '/agents', label: 'Agentes', icon: '✦' },
  { path: '/mcp-servers', label: 'MCP Servers', icon: '⬡' },
  { path: '/conversations', label: 'Conversaciones', icon: '▤' },
  { path: '/files', label: 'Archivos', icon: '📄' },
  { path: '/roles', label: 'Roles', icon: '◈' },
];

const pageTitle = computed(() => {
  const match = navItems.find((item) =>
    item.path === '/' ? route.path === '/' : route.path.startsWith(item.path),
  );
  return match?.label || route.name || 'Admin';
});

const isAuthCallbackRoute = computed(() => {
  if (route.path.startsWith('/auth/')) return true;
  // Guardia extra: a veces el router aún no resolvió y el watch disparaba SSO otra vez.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')) {
    return true;
  }
  return false;
});

const mainStyle = computed(() => ({
  '--sidebar-current-width': collapsed.value
    ? 'var(--sidebar-width-collapsed)'
    : 'var(--sidebar-width)',
}));

watch(
  () => route.fullPath,
  () => {
    closeMobile();
  },
);

// Igual que ti-promos SSO_ONLY: sin botón; redirect directo a Keycloak.
// Nunca iniciar SSO en /auth/* ni si ya hay sesión autenticada en memoria.
// No mirar localStorage aquí: un token huérfano dejaba la UI en blanco sin redirect.
watch(
  [isInitializing, isAuthenticated, openidEnabled, isAuthCallbackRoute],
  ([initializing, authenticated, ssoOn, onCallback]) => {
    if (initializing || authenticated || onCallback || !ssoOn) return;
    if (isRedirectingToSso.value) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')) return;
    startOpenIdLogin();
  },
);

onMounted(() => {
  initialize();
});
</script>
