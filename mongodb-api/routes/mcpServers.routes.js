const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getMCPServers,
  getMCPServerById,
  createMCPServer,
  updateMCPServer,
  deleteMCPServer,
} = require('../controllers/mcpServers.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getMCPServers);
router.post('/', createMCPServer);
router.get('/:id', getMCPServerById);
router.put('/:id', updateMCPServer);
router.delete('/:id', deleteMCPServer);

module.exports = router;
