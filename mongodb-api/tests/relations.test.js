const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, loginAdmin, startTestServer, stopTestServer, cleanupTestDocs } = require('./helpers');
const { getWriteDB } = require('../config/db');

const TAG = 'relations-test';

describe('Relations, usage, files', () => {
  let userId;
  let roleId;
  let mcpId;
  let agentId;

  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();

    const db = getWriteDB();
    const now = new Date();

    const userRes = await db.collection('users').insertOne({
      email: `rel.user.${Date.now()}@test.local`,
      name: 'Relations User',
      role: 'USER',
      provider: 'local',
      password: 'x',
      seedSource: TAG,
      createdAt: now,
      updatedAt: now,
    });
    userId = userRes.insertedId;

    const role = await db.collection('roles').findOne({ name: 'USER' });
    roleId = role._id;

    const mcpRes = await db.collection('mcpservers').insertOne({
      serverName: `rel-mcp-${Date.now()}`,
      config: { title: 'Rel MCP', type: 'streamable-http', url: 'http://localhost/mcp' },
      seedSource: TAG,
      createdAt: now,
      updatedAt: now,
    });
    mcpId = mcpRes.insertedId;
    const mcp = await db.collection('mcpservers').findOne({ _id: mcpId });

    const agentRes = await db.collection('agents').insertOne({
      id: `agent_rel_${Date.now()}`,
      name: 'Rel Agent',
      provider: 'openAI',
      model: 'gpt-4o-mini',
      tools: [`sys__server__sys_mcp_${mcp.serverName}`, `Calc_mcp_${mcp.serverName}`],
      mcpServerNames: [mcp.serverName],
      author: userId,
      authorName: 'Relations User',
      seedSource: TAG,
      createdAt: now,
      updatedAt: now,
    });
    agentId = agentRes.insertedId;

    await db.collection('conversations').insertOne({
      conversationId: `rel-convo-${Date.now()}`,
      title: 'Rel convo',
      user: String(userId),
      seedSource: TAG,
      createdAt: now,
      updatedAt: now,
    });

    await db.collection('transactions').insertMany([
      {
        user: userId,
        tokenType: 'prompt',
        model: 'gpt-4o-mini',
        rawAmount: -120,
        tokenValue: 120,
        seedSource: TAG,
        createdAt: now,
        updatedAt: now,
      },
      {
        user: userId,
        tokenType: 'completion',
        model: 'gpt-4o-mini',
        rawAmount: -80,
        tokenValue: 80,
        seedSource: TAG,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.collection('files').insertOne({
      filename: `rel-file-${Date.now()}.txt`,
      file_id: `file_${Date.now()}`,
      filepath: '/tmp/rel.txt',
      type: 'text/plain',
      bytes: 2048,
      user: userId,
      seedSource: TAG,
      createdAt: now,
      updatedAt: now,
    });
  });

  after(async () => {
    const db = getWriteDB();
    await db.collection('users').deleteMany({ seedSource: TAG });
    await db.collection('mcpservers').deleteMany({ seedSource: TAG });
    await db.collection('agents').deleteMany({ seedSource: TAG });
    await db.collection('conversations').deleteMany({ seedSource: TAG });
    await db.collection('transactions').deleteMany({ seedSource: TAG });
    await db.collection('files').deleteMany({ seedSource: TAG });
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('GET /api/users enriches provider/usage fields', async () => {
    const res = await api('/api/users?limit=100');
    assert.equal(res.status, 200);
    const user = (res.data.documents || []).find((doc) => String(doc._id) === String(userId));
    assert.ok(user);
    assert.equal(user.provider, 'local');
    assert.ok(user.conversationCount >= 1);
    assert.ok(user.totalTokens >= 200);
  });

  it('GET /api/users/:id/usage returns counts and tokens', async () => {
    const res = await api(`/api/users/${userId}/usage?range=30d`);
    assert.equal(res.status, 200);
    assert.equal(String(res.data.user._id), String(userId));
    assert.ok(res.data.counts.conversationCount >= 1);
    assert.ok(res.data.usage.totals.totalTokens >= 200);
  });

  it('GET /api/roles/:id/users lists users of role', async () => {
    const res = await api(`/api/roles/${roleId}/users?limit=50`);
    assert.equal(res.status, 200);
    assert.equal(res.data.role.name, 'USER');
    assert.ok((res.data.documents || []).some((doc) => String(doc._id) === String(userId)));
  });

  it('GET /api/mcpservers/:id returns referencing agents', async () => {
    const res = await api(`/api/mcpservers/${mcpId}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.document.agentCount >= 1);
    assert.ok(
      (res.data.document.agents || []).some((agent) => String(agent._id) === String(agentId)),
    );
  });

  it('GET /api/agents?mcp= filters by mcpServerNames', async () => {
    const mcp = (await api(`/api/mcpservers/${mcpId}`)).data.document;
    const res = await api(`/api/agents?mcp=${encodeURIComponent(mcp.serverName)}`);
    assert.equal(res.status, 200);
    assert.ok((res.data.documents || []).some((agent) => String(agent._id) === String(agentId)));
  });

  it('GET /api/transactions/summary returns aggregates', async () => {
    const res = await api('/api/transactions/summary?range=30d');
    assert.equal(res.status, 200);
    assert.ok(res.data.totals);
    assert.ok(Array.isArray(res.data.byType));
    assert.ok(Array.isArray(res.data.byUser));
  });

  it('GET /api/transactions lists docs', async () => {
    const res = await api(`/api/transactions?user=${userId}&range=all`);
    assert.equal(res.status, 200);
    assert.ok((res.data.documents || []).length >= 2);
  });

  it('GET /api/files returns files', async () => {
    const res = await api('/api/files');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.documents));
    assert.ok(
      res.data.documents.some((file) => String(file.user) === String(userId) || file.userEmail),
    );
  });
});
