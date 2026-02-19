import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Users from '../views/Users.vue'
import MCPServers from '../views/MCPServers.vue'
import Roles from '../views/Roles.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/users',
    name: 'Users',
    component: Users
  },
  {
    path: '/mcp-servers',
    name: 'MCPServers',
    component: MCPServers
  },
  {
    path: '/roles',
    name: 'Roles',
    component: Roles
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
