const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, loginAdmin, startTestServer, stopTestServer, cleanupTestDocs } = require('./helpers');

describe('Read-only agents & conversations', () => {
  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('GET /api/agents returns paginated list', async () => {
    const res = await api('/api/agents?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
    assert.equal(typeof res.data.total, 'number');
    assert.equal(res.data.page, 1);
  });

  it('GET /api/agents/:id returns 404 for missing agent', async () => {
    const res = await api('/api/agents/agent_does_not_exist_xyz');
    assert.equal(res.status, 404);
  });

  it('GET /api/conversations returns paginated list', async () => {
    const res = await api('/api/conversations?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
    assert.equal(typeof res.data.totalPages, 'number');
  });

  it('GET /api/messages accepts conversationId filter', async () => {
    const res = await api('/api/messages?page=1&limit=5&conversationId=seed-convo-1');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
  });

  it('rejects unauthenticated agents access', async () => {
    const res = await api('/api/agents', { token: null });
    assert.equal(res.status, 401);
  });
});
