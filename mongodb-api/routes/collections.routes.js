const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { 
  getMCPServers, createMCPServer, updateMCPServer, deleteMCPServer,
  getRoles, createRole, updateRole, deleteRole,
  getCollectionsStats
} = require('../controllers/collections.controller');

const router = express.Router();

// Protect ALL routes in this file
router.use(requireAuth, requireAdmin);

// MCP Servers
router.get('/mcpservers', getMCPServers);
router.post('/mcpservers', createMCPServer);
router.put('/mcpservers/:id', updateMCPServer);
router.delete('/mcpservers/:id', deleteMCPServer);

// Roles
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// Stats
router.get('/stats', getCollectionsStats);
router.get('/collections', getCollectionsStats); // Keep for compatibility if needed

module.exports = router;
