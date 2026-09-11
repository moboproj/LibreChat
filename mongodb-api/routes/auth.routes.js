const express = require('express');
const { login, refresh, logout, getConfig } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/config', getConfig);
router.post('/verify-password', login);

module.exports = router;
