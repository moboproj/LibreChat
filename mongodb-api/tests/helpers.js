const http = require('http');
const path = require('path');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env.admin') });
require('dotenv').config();

function resolveMongoUri() {
  if (process.env.TEST_MONGODB_URI) return process.env.TEST_MONGODB_URI.trim();
  const fromEnv = (process.env.MONGODB_URI_PRIMARY || process.env.MONGODB_URI || '').trim();
  if (!fromEnv) return 'mongodb://127.0.0.1:27017/LibreChat';
  return fromEnv
    .replace('://mongodb:', '://127.0.0.1:')
    .replace('://chat-mongodb:', '://127.0.0.1:');
}

process.env.MONGODB_URI = resolveMongoUri();
process.env.MONGODB_URI_PRIMARY = process.env.MONGODB_URI;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_admin_panel';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_admin';
// Always enable user writes in shared CRUD helpers (SSO lock has its own test file).
process.env.ADMIN_USERS_WRITE_ENABLED = 'true';
process.env.ADMIN_LOCAL_LOGIN_ENABLED = 'true';

const { createApp } = require('../app');
const { connectDB, closeDB, getWriteDB } = require('../config/db');

const TEST_TAG = 'crud-test';
const ADMIN_EMAIL = 'crud.admin@test.local';
const ADMIN_PASSWORD = 'CrudAdmin123!';

let server;
let baseUrl = '';
let accessToken = '';

function defaultPermissions() {
  return {
    BOOKMARKS: { USE: true },
    PROMPTS: { USE: true, CREATE: true, SHARE: false, SHARE_PUBLIC: false },
    MEMORIES: { USE: true, CREATE: true, UPDATE: true, READ: true, OPT_OUT: true },
    AGENTS: { USE: true, CREATE: false, SHARE: false, SHARE_PUBLIC: false },
    MULTI_CONVO: { USE: true },
    TEMPORARY_CHAT: { USE: true },
    RUN_CODE: { USE: true },
    WEB_SEARCH: { USE: true },
    PEOPLE_PICKER: { VIEW_USERS: false, VIEW_GROUPS: false, VIEW_ROLES: false },
    MARKETPLACE: { USE: false },
    FILE_SEARCH: { USE: true },
    FILE_CITATIONS: { USE: true },
    MCP_SERVERS: { USE: true, CREATE: false, SHARE: false, SHARE_PUBLIC: false },
    REMOTE_AGENTS: { USE: false, CREATE: false, SHARE: false, SHARE_PUBLIC: false },
  };
}

async function ensureBaseRoles(db) {
  const now = new Date();
  for (const name of ['ADMIN', 'USER', 'STORE']) {
    await db.collection('roles').updateOne(
      { name },
      {
        $set: {
          name,
          permissions: defaultPermissions(),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now, seedSource: TEST_TAG },
      },
      { upsert: true },
    );
  }
}

async function ensureAdminUser(db) {
  const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const now = new Date();
  await db.collection('users').updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        name: 'CRUD Test Admin',
        password,
        role: 'ADMIN',
        provider: 'local',
        emailVerified: true,
        seedSource: TEST_TAG,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

async function api(pathname, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token === null ? null : token || accessToken;
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function loginAdmin() {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    token: null,
  });
  if (!res.data.accessToken) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  accessToken = res.data.accessToken;
  return accessToken;
}

async function startTestServer() {
  await connectDB();
  const db = getWriteDB();
  await ensureBaseRoles(db);
  await ensureAdminUser(db);

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await loginAdmin();
  return { baseUrl, accessToken, db };
}

async function stopTestServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  await closeDB();
}

async function cleanupTestDocs() {
  const db = getWriteDB();
  await Promise.all([
    db.collection('users').deleteMany({
      $or: [{ seedSource: TEST_TAG }, { email: /@crud\.test\.local$/i }],
    }),
    db.collection('roles').deleteMany({
      name: /^CRUD_TEST_/,
    }),
    db.collection('mcpservers').deleteMany({
      $or: [{ seedSource: TEST_TAG }, { serverName: /^crud-test-/ }],
    }),
  ]);
  await ensureBaseRoles(db);
  await ensureAdminUser(db);
}

function unique(suffix = '') {
  return `${Date.now()}${suffix}${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  ObjectId,
  TEST_TAG,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  defaultPermissions,
  api,
  loginAdmin,
  startTestServer,
  stopTestServer,
  cleanupTestDocs,
  unique,
  getAccessToken: () => accessToken,
  getBaseUrl: () => baseUrl,
};
