<template>
  <div class="app">
    <!-- Login Overlay -->
    <div v-if="requiresAuth && !isAuthenticated" class="login-overlay">
      <div class="login-box">
        <h2>LibreChat Admin</h2>
        <p>Introduce la contraseña de administrador</p>
        <form @submit.prevent="login">
          <input
            v-model="loginPassword"
            type="password"
            placeholder="Contraseña"
            required
            autoFocus
          />
          <button type="submit" class="btn btn-primary">Entrar</button>
          <p v-if="loginError" class="error">{{ loginError }}</p>
        </form>
      </div>
    </div>

    <template v-else>
      <nav class="sidebar">
        <div class="sidebar-header">
          <h1>LibreChat Admin</h1>
        </div>
        <div class="sidebar-nav">
          <router-link
            v-for="route in routes"
            :key="route.path"
            :to="route.path"
            class="nav-link"
            active-class="active"
          >
            <span>{{ route.name }}</span>
          </router-link>
        </div>
        <div class="sidebar-footer" v-if="isAuthenticated">
          <button @click="logout" class="btn-logout">Cerrar Sesión</button>
        </div>
      </nav>
      <main class="main-content">
        <header class="header">
          <h2>{{ $route.name }}</h2>
        </header>
        <div class="content">
          <router-view />
        </div>
      </main>
    </template>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      routes: [
        { path: '/', name: '📊 Dashboard' },
        { path: '/statistics', name: '📈 Estadísticas' },
        { path: '/users', name: '👥 Usuarios' },
        { path: '/mcp-servers', name: '🔌 MCP Servers' },
        { path: '/roles', name: '🔐 Roles' },
      ],
      requiresAuth: false,
      isAuthenticated: false,
      loginPassword: '',
      loginError: '',
    };
  },
  async mounted() {
    await this.checkAuthConfig();
    const savedSession = localStorage.getItem('admin_session');
    if (savedSession) {
      this.isAuthenticated = true;
    }
  },
  methods: {
    async checkAuthConfig() {
      try {
        const response = await this.$axios.get('/api/config');
        this.requiresAuth = response.data.passwordRequired;
      } catch (error) {
        console.error('Error checking auth config:', error);
      }
    },
    async login() {
      try {
        const response = await this.$axios.post('/api/verify-password', {
          password: this.loginPassword,
        });
        if (response.data.valid) {
          this.isAuthenticated = true;
          localStorage.setItem('admin_session', 'true');
          this.loginError = '';
        }
      } catch (error) {
        this.loginError = 'Contraseña incorrecta';
      }
    },
    logout() {
      this.isAuthenticated = false;
      localStorage.removeItem('admin_session');
      this.loginPassword = '';
    },
  },
};
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: #0f172a;
}

.login-overlay {
  position: fixed;
  inset: 0;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.login-box {
  background: #1e293b;
  padding: 40px;
  border-radius: 12px;
  border: 1px solid #334155;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-box h2 {
  color: #f1f5f9;
  margin-bottom: 10px;
}

.login-box p {
  color: #94a3b8;
  margin-bottom: 25px;
}

.login-box form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-box input {
  padding: 12px 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 16px;
}

.error {
  color: #f87171;
  font-size: 14px;
  margin-top: 10px;
}

.sidebar {
  width: 250px;
  background: #1e293b;
  border-right: 1px solid #334155;
  padding: 20px;
  overflow-y: auto;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  left: 0;
  top: 0;
}

.sidebar-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #334155;
}

.sidebar-header h1 {
  font-size: 20px;
  color: #f1f5f9;
  margin: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.sidebar-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #334155;
}

.btn-logout {
  width: 100%;
  padding: 10px;
  background: #334155;
  color: #cbd5e1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: #ef4444;
  color: white;
}

.nav-link {
  padding: 12px 16px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background: #334155;
  color: #f1f5f9;
}

.nav-link.active {
  background: #0f4c75;
  color: #60a5fa;
  border-left-color: #60a5fa;
}

.btn-primary {
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
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
  .sidebar {
    width: 200px;
  }
  .main-content {
    margin-left: 200px;
  }
}
</style>
