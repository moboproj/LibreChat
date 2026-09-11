const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  api,
  loginAdmin,
  startTestServer,
  stopTestServer,
  cleanupTestDocs,
  unique,
} = require('./helpers');

describe('Agents CRUD', () => {
  let agentKey = '';
  let mongoId = '';

  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    if (agentKey) {
      await api(`/api/agents/${agentKey}`, { method: 'DELETE' }).catch(() => {});
    }
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('CREATE agent with instructions and tools', async () => {
    const name = `CRUD Agent ${unique()}`;
    const res = await api('/api/agents', {
      method: 'POST',
      body: {
        name,
        provider: 'openAI',
        model: 'gpt-4o-mini',
        description: 'Agent created by test',
        instructions: 'You are a helpful test agent.',
        tools: ['web_search', 'sys__server__sys_mcp_demo-mcp', 'Calculator_mcp_demo-mcp'],
        category: 'test',
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.id);
    assert.ok(res.data._id);
    agentKey = res.data.id;
    mongoId = String(res.data._id);
  });

  it('CREATE rejects missing required fields', async () => {
    const res = await api('/api/agents', {
      method: 'POST',
      body: { name: 'Incomplete' },
    });
    assert.equal(res.status, 400);
  });

  it('READ agent detail includes instructions/tools', async () => {
    const res = await api(`/api/agents/${agentKey}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.document.id, agentKey);
    assert.equal(res.data.document.instructions, 'You are a helpful test agent.');
    assert.ok(res.data.document.tools.includes('web_search'));
    assert.ok(res.data.document.tools.includes('Calculator_mcp_demo-mcp'));
    assert.ok(res.data.document.mcpServerNames.includes('demo-mcp'));
  });

  it('UPDATE agent instructions and tools', async () => {
    const res = await api(`/api/agents/${agentKey}`, {
      method: 'PUT',
      body: {
        name: 'CRUD Agent Updated',
        provider: 'openAI',
        model: 'gpt-4o',
        instructions: 'Updated instructions',
        tools: ['execute_code', 'file_search_mcp_alpha', 'sys__server__sys_mcp_alpha'],
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const detail = await api(`/api/agents/${mongoId}`);
    assert.equal(detail.data.document.name, 'CRUD Agent Updated');
    assert.equal(detail.data.document.model, 'gpt-4o');
    assert.equal(detail.data.document.instructions, 'Updated instructions');
    assert.deepEqual(detail.data.document.tools, [
      'execute_code',
      'file_search_mcp_alpha',
      'sys__server__sys_mcp_alpha',
    ]);
    assert.deepEqual(detail.data.document.mcpServerNames, ['alpha']);
    assert.equal(detail.data.document.id, agentKey);
  });

  it('LIST finds updated agent by search', async () => {
    const res = await api('/api/agents?search=CRUD%20Agent%20Updated&limit=20');
    assert.equal(res.status, 200);
    const found = res.data.documents.find((a) => a.id === agentKey);
    assert.ok(found);
  });

  it('DELETE agent', async () => {
    const res = await api(`/api/agents/${agentKey}`, { method: 'DELETE' });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const missing = await api(`/api/agents/${agentKey}`);
    assert.equal(missing.status, 404);
    agentKey = '';
  });
});
