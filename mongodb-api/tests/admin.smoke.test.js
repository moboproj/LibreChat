const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, loginAdmin, startTestServer, stopTestServer, cleanupTestDocs } = require('./helpers');

describe('Admin panel API smoke', () => {
  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('auth config', async () => {
    const res = await api('/api/auth/config', { token: null });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(typeof res.data.localLoginEnabled, 'boolean');
  });

  it('users list', async () => {
    const res = await api('/api/users?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
    assert.equal(typeof res.data.total, 'number');
  });

  it('roles list', async () => {
    const res = await api('/api/roles?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
  });

  it('mcp servers list', async () => {
    const res = await api('/api/mcpservers?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
  });

  it('agents list + share roles + catalog', async () => {
    const agents = await api('/api/agents?page=1&limit=5');
    assert.equal(agents.status, 200);
    assert.ok(Array.isArray(agents.data.documents));

    const roles = await api('/api/agents/share/roles');
    assert.equal(roles.status, 200);
    assert.ok(Array.isArray(roles.data.roles));

    const catalog = await api('/api/catalog/agent-options');
    assert.equal(catalog.status, 200);
    assert.ok(
      Array.isArray(catalog.data.providers) ||
        Array.isArray(catalog.data?.data?.providers) ||
        catalog.data,
    );
  });

  it('conversations + messages', async () => {
    const conversations = await api('/api/conversations?page=1&limit=5');
    assert.equal(conversations.status, 200);
    assert.ok(Array.isArray(conversations.data.documents));

    const messages = await api('/api/messages?page=1&limit=5');
    assert.equal(messages.status, 200);
    assert.ok(Array.isArray(messages.data.documents));
  });

  it('transactions + files + stats', async () => {
    const transactions = await api('/api/transactions?page=1&limit=5');
    assert.equal(transactions.status, 200, JSON.stringify(transactions.data));
    assert.ok(Array.isArray(transactions.data.documents));

    const files = await api('/api/files?page=1&limit=5');
    assert.equal(files.status, 200, JSON.stringify(files.data));
    assert.ok(Array.isArray(files.data.documents));

    const stats = await api('/api/stats?range=7d');
    assert.equal(stats.status, 200, JSON.stringify(stats.data));
    assert.ok(stats.data.totals || stats.data);
  });
});
