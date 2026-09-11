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

const config = {
  port: Number(process.env.PORT) || 8082,
  // Option A (K8s): primary for writes; optional read URI for replicas. Falls back to primary.
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
};

if (!config.mongoReadUri) {
  config.mongoReadUri = config.mongoPrimaryUri;
}

module.exports = config;
