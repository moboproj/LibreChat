<template>
  <div class="app">
    <LoadingOverlay v-if="isInitializing" />

    <template v-else>
      <LoginForm
        v-if="requiresAuth && !isAuthenticated"
        v-model:email="loginEmail"
        v-model:password="loginPassword"
        :error="loginError"
        @submit="login"
      />

      <template v-else>
        <AppSidebar
          :routes="navRoutes"
          :user="isAuthenticated ? currentUser : null"
          @logout="logout"
        />
        <main class="main-content">
          <header class="header">
            <h2>{{ route.name }}</h2>
          </header>
          <div class="content">
            <router-view />
          </div>
        </main>
      </template>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './composables/useAuth';
import LoginForm from './components/presentational/LoginForm.vue';
import AppSidebar from './components/presentational/AppSidebar.vue';
import LoadingOverlay from './components/presentational/LoadingOverlay.vue';

const route = useRoute();
const {
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
} = useAuth();

const navRoutes = [
  { path: '/', name: '📊 Dashboard' },
  { path: '/statistics', name: '📈 Estadísticas' },
  { path: '/users', name: '👥 Usuarios' },
  { path: '/mcp-servers', name: '🔌 MCP Servers' },
  { path: '/roles', name: '🔐 Roles' },
];

onMounted(() => {
  initialize();
});
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: #0f172a;
}

.main-content {
  margin-left: 250px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h2 {
  margin: 0;
  color: #f1f5f9;
}

.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 200px;
  }
}
</style>
