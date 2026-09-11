const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, loginAdmin, startTestServer, stopTestServer, cleanupTestDocs } = require('./helpers');

describe('Users write lock (SSO mode)', () => {
  before(async () => {
    process.env.ADMIN_USERS_WRITE_ENABLED = 'false';
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    process.env.ADMIN_USERS_WRITE_ENABLED = 'true';
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('GET /api/auth/config reports usersWriteEnabled=false', async () => {
    const res = await api('/api/auth/config');
    assert.equal(res.status, 200);
    assert.equal(res.data.usersWriteEnabled, false);
    assert.equal(typeof res.data.openidEnabled, 'boolean');
  });

  it('GET /api/users still works', async () => {
    const res = await api('/api/users?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
  });

  it('POST /api/users is forbidden', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      body: {
        email: 'blocked.create@crud.test.local',
        password: 'TempPass123!',
        role: 'USER',
      },
    });
    assert.equal(res.status, 403, JSON.stringify(res.data));
  });

  it('GET /api/users/sso/status is allowed under write lock', async () => {
    const res = await api('/api/users/sso/status');
    assert.equal(res.status, 200);
    assert.equal(typeof res.data.configured, 'boolean');
  });
});
