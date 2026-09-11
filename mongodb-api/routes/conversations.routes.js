const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getConversations,
  getConversationById,
} = require('../controllers/conversations.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getConversations);
router.get('/:id', getConversationById);

module.exports = router;
