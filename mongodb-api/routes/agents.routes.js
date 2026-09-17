const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentShareMeta,
  getAgentShareUsers,
  getAgentShareGroups,
  setAgentSharePermission,
} = require('../controllers/agents.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getAgents);
router.post('/', createAgent);
router.get('/share/roles', getAgentShareMeta);
router.get('/:id/share/users', getAgentShareUsers);
router.get('/:id/share/groups', getAgentShareGroups);
router.put('/:id/share', setAgentSharePermission);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

module.exports = router;
