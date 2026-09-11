const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getAgentOptions } = require('../controllers/catalog.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/agent-options', getAgentOptions);

module.exports = router;
