const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getTransactions,
  getTransactionsSummary,
} = require('../controllers/transactions.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/summary', getTransactionsSummary);
router.get('/', getTransactions);

module.exports = router;
