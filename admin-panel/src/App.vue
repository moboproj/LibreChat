<template>
  <div class="app">
    <!-- Login Overlay -->
    <div v-if="requiresAuth && !isAuthenticated" class="login-overlay">
      <div class="login-box">
        <h2>LibreChat Admin</h2>
        <p>Introduce la contraseña de administrador</p>
        <form @submit.prevent="login">
          <input
            v-model="loginEmail"
            type="email"
            placeholder="Email"
            required
            autoFocus
          />
          <input
            v-model="loginPassword"
            type="password"
            placeholder="Contraseña"
            required
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
          <div class="user-profile">
            <div class="user-info">
              <span class="user-name">{{ currentUser.name || 'Admin' }}</span>
              <span class="user-email">{{ currentUser.email }}</span>
              <span class="user-role-badge">{{ currentUser.role }}</span>
            </div>
          </div>
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
      currentUser: {
        name: '',
        email: '',
        role: ''
      },
      loginEmail: '',
      loginPassword: '',
      loginError: '',
    };
  },
  async mounted() {
    await this.checkAuthConfig();
    const savedSession = localStorage.getItem('admin_session');
    if (savedSession) {
      this.isAuthenticated = true;
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    }
  },
  methods: {
    async checkAuthConfig() {
      try {
        const response = await this.$axios.get('/api/auth/config');
        this.requiresAuth = response.data.passwordRequired;
      } catch (error) {
        console.error('Error checking auth config:', error);
      }
    },
    async login() {
      try {
        const response = await this.$axios.post('/api/auth/login', {
          email: this.loginEmail,
          password: this.loginPassword,
        });
        if (response.data.valid) {
          this.isAuthenticated = true;
          this.currentUser = response.data.user;
          localStorage.setItem('admin_session', 'true');
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
          this.loginError = '';
        }
      } catch (error) {
        this.loginError = error.response?.data?.message || 'Error al iniciar sesión';
      }
    },
    logout() {
      this.isAuthenticated = false;
      this.currentUser = { name: '', email: '', role: '' };
      localStorage.removeItem('admin_session');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
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

.user-profile {
  margin-bottom: 20px;
  padding: 15px;
  background: #0f172a;
  border-radius: 10px;
  border: 1px solid #334155;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 14px;
}

.user-email {
  color: #94a3b8;
  font-size: 11px;
  word-break: break-all;
}

.user-role-badge {
  margin-top: 6px;
  display: inline-block;
  padding: 2px 8px;
  background: #1e293b;
  color: #60a5fa;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  width: fit-content;
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
