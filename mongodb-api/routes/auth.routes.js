const express = require('express');
const { login, refresh, logout, getConfig } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/config', getConfig);

// Retrocompatibility for the old verify-password endpoint used by the current frontend 
// until we switch to the new Pinia/auth store implementation
router.post('/verify-password', login);

module.exports = router;
