const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.admin') });
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name];
  if (value && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function envBool(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return defaultValue;
  }
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

const openidClientId = required('OPENID_CLIENT_ID', '');
const adminPanelUrl = required('ADMIN_PANEL_URL', 'http://localhost:5173').replace(/\/$/, '');

const config = {
  port: Number(process.env.PORT) || 8082,
  mongoPrimaryUri: required(
    'MONGODB_URI_PRIMARY',
    required('MONGODB_URI', 'mongodb://127.0.0.1:27017/LibreChat'),
  ),
  mongoReadUri: required('MONGODB_URI_READ', null),
  jwtSecret: required('JWT_SECRET', 'librechat_admin_secret_key_change_me_in_production'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'librechat_admin_refresh_secret_change_me'),
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  serviceToken: process.env.SERVICE_TOKEN || '',
  // SSO delegated (defaults; client = OPENID_CLIENT_ID)
  ssoDelegatedBaseUrl: required(
    'SSO_DELEGATED_BASE_URL',
    'https://sso.mobo.com.mx/admin/api/delegated/systems',
  ),
  ssoDelegatedClientId: required('SSO_DELEGATED_CLIENT_ID', openidClientId),
  ssoDelegatedAccessToken: required('SSO_DELEGATED_ACCESS_TOKEN', ''),
  // OpenID login — only issuer + client id are required in .env.admin
  openidIssuer: required('OPENID_ISSUER', ''),
  openidClientId,
  openidClientSecret: required('OPENID_CLIENT_SECRET', ''),
  openidScope: 'openid profile email',
  openidCallbackUrl: required(
    'OPENID_CALLBACK_URL',
    'http://localhost:8082/api/auth/openid/callback',
  ),
  openidUsePkce: true,
  adminPanelUrl,
  // After Keycloak logout, restart OIDC → Keycloak login screen (no SPA "signed-out").
  openidPostLogoutRedirectUri: required(
    'OPENID_POST_LOGOUT_REDIRECT_URI',
    'http://localhost:8082/api/auth/openid',
  ),
};

Object.defineProperty(config, 'usersWriteEnabled', {
  enumerable: true,
  get() {
    return envBool('ADMIN_USERS_WRITE_ENABLED', false);
  },
});

Object.defineProperty(config, 'localLoginEnabled', {
  enumerable: true,
  get() {
    // Off by default: admin panel is SSO-only. Tests may set ADMIN_LOCAL_LOGIN_ENABLED=true.
    return envBool('ADMIN_LOCAL_LOGIN_ENABLED', false);
  },
});

Object.defineProperty(config, 'openidEnabled', {
  enumerable: true,
  get() {
    return Boolean(config.openidIssuer && config.openidClientId);
  },
});

Object.defineProperty(config, 'ssoLinkConfigured', {
  enumerable: true,
  get() {
    return Boolean(config.ssoDelegatedClientId);
  },
});

if (!config.mongoReadUri) {
  config.mongoReadUri = config.mongoPrimaryUri;
}

module.exports = config;
