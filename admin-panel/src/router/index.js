import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/auth/openid/callback',
    name: 'OpenIdCallback',
    component: () => import('../views/OpenIdCallback.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/signed-out',
    name: 'SignedOut',
    component: () => import('../views/SignedOut.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('../views/Statistics.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/usage',
    name: 'Usage',
    component: () => import('../views/Usage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/Users.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('../views/Agents.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mcp-servers',
    name: 'MCPServers',
    component: () => import('../views/MCPServers.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/conversations',
    name: 'Conversations',
    component: () => import('../views/Conversations.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/files',
    name: 'Files',
    component: () => import('../views/Files.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/roles',
    name: 'Roles',
    component: () => import('../views/Roles.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true;
  const token = localStorage.getItem('accessToken');
  const session = localStorage.getItem('admin_session');
  if (token && session) return true;
  // La raíz la maneja App.vue (SSO). No redirigir / → /?login=1 (bucle / pantalla vacía).
  if (to.path === '/') return true;
  return { path: '/' };
});

export default router;
