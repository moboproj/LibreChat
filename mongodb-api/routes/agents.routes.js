const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
} = require('../controllers/agents.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getAgents);
router.post('/', createAgent);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

module.exports = router;
