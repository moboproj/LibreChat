<template>
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
    <div v-if="user" class="sidebar-footer">
      <div class="user-profile">
        <div class="user-info">
          <span class="user-name">{{ user.name || 'Admin' }}</span>
          <span class="user-email">{{ user.email }}</span>
          <span class="user-role-badge">{{ user.role }}</span>
        </div>
      </div>
      <button class="btn-logout" @click="$emit('logout')">Cerrar Sesión</button>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  routes: { type: Array, required: true },
  user: { type: Object, default: null },
});

defineEmits(['logout']);
</script>

<style scoped>
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

@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
}
</style>
