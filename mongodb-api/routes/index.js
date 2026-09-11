const express = require('express');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const mcpServersRoutes = require('./mcpServers.routes');
const rolesRoutes = require('./roles.routes');
const agentsRoutes = require('./agents.routes');
const conversationsRoutes = require('./conversations.routes');
const messagesRoutes = require('./messages.routes');
const filesRoutes = require('./files.routes');
const transactionsRoutes = require('./transactions.routes');
const { login } = require('../controllers/auth.controller');
const { getCollectionsStats } = require('../controllers/stats.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/mcpservers', mcpServersRoutes);
router.use('/roles', rolesRoutes);
router.use('/agents', agentsRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/messages', messagesRoutes);
router.use('/files', filesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/catalog', require('./catalog.routes'));

// Retrocompatibility for old frontend path (must stay before catch-all-style mounts)
router.post('/verify-password', login);

router.get('/stats', requireAuth, requireAdmin, getCollectionsStats);
router.get('/collections', requireAuth, requireAdmin, getCollectionsStats);

module.exports = router;
