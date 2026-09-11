const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, loginAdmin, startTestServer, stopTestServer, cleanupTestDocs } = require('./helpers');
const { extractMcpServerNamesFromTools, mcpServerToken } = require('../services/agentCatalog');

describe('Agent catalog', () => {
  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('GET /api/catalog/agent-options returns providers, models, builtins, mcp', async () => {
    const res = await api('/api/catalog/agent-options');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.providers));
    assert.ok(res.data.providers.length > 0);
    assert.ok(res.data.modelsByProvider);
    assert.ok(Array.isArray(res.data.builtinTools));
    assert.ok(res.data.builtinTools.some((t) => t.id === 'web_search'));
    assert.ok(Array.isArray(res.data.mcpServers));
    assert.equal(res.data.meta.mcpDelimiter, '_mcp_');
  });

  it('extractMcpServerNamesFromTools derives servers from embedded tools', () => {
    const names = extractMcpServerNamesFromTools([
      'web_search',
      mcpServerToken('ventasutilities'),
      'Calculator_mcp_ventasutilities',
      'Date_Time_mcp_supply',
    ]);
    assert.deepEqual(names.sort(), ['supply', 'ventasutilities']);
  });
});
