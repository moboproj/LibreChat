const express = require('express');
const { login, refresh, logout, getConfig } = require('../controllers/auth.controller');
const {
  startOpenIdLogin,
  openIdCallback,
  exchangeOpenIdCode,
  openIdLogoutRedirect,
  openIdLogoutComplete,
} = require('../controllers/authOpenId.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/config', getConfig);
router.post('/verify-password', login);

router.get('/openid', startOpenIdLogin);
router.get('/openid/callback', openIdCallback);
router.post('/openid/exchange', exchangeOpenIdCode);
router.get('/openid/logout', openIdLogoutRedirect);
router.post('/openid/logout', openIdLogoutRedirect);
router.get('/openid/logout-complete', openIdLogoutComplete);

module.exports = router;
