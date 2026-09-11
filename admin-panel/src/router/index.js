import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Users from '../views/Users.vue';
import MCPServers from '../views/MCPServers.vue';
import Roles from '../views/Roles.vue';
import Statistics from '../views/Statistics.vue';
import Agents from '../views/Agents.vue';
import Conversations from '../views/Conversations.vue';
import Usage from '../views/Usage.vue';
import Files from '../views/Files.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics,
    meta: { requiresAuth: true },
  },
  {
    path: '/usage',
    name: 'Usage',
    component: Usage,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: Agents,
    meta: { requiresAuth: true },
  },
  {
    path: '/mcp-servers',
    name: 'MCPServers',
    component: MCPServers,
    meta: { requiresAuth: true },
  },
  {
    path: '/conversations',
    name: 'Conversations',
    component: Conversations,
    meta: { requiresAuth: true },
  },
  {
    path: '/files',
    name: 'Files',
    component: Files,
    meta: { requiresAuth: true },
  },
  {
    path: '/roles',
    name: 'Roles',
    component: Roles,
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
  if (token || session) return true;
  return { path: '/', query: { login: '1' } };
});

export default router;
