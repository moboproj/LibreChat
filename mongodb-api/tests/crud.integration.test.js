const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  api,
  loginAdmin,
  startTestServer,
  stopTestServer,
  cleanupTestDocs,
  unique,
  defaultPermissions,
  ObjectId,
  TEST_TAG,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} = require('./helpers');

describe('CRUD integration', () => {
  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();
  });

  after(async () => {
    await cleanupTestDocs();
    await stopTestServer();
  });

  describe('Auth', () => {
    it('logs in with valid admin credentials', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        token: null,
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.valid, true);
      assert.ok(res.data.accessToken);
      assert.equal(res.data.user.role, 'ADMIN');
    });

    it('rejects invalid credentials', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email: ADMIN_EMAIL, password: 'wrong-password' },
        token: null,
      });
      assert.equal(res.status, 401);
      assert.equal(res.data.valid, false);
    });

    it('rejects users list without token', async () => {
      const res = await api('/api/users?page=1&limit=5', { token: null });
      assert.equal(res.status, 401);
    });
  });

  describe('Users CRUD', () => {
    let userId = '';
    const email = `user.${unique()}@crud.test.local`;

    it('CREATE user', async () => {
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          email,
          name: 'CRUD User',
          password: 'TempPass123!',
          role: 'USER',
        },
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.ok(res.data._id);
      userId = String(res.data._id);
    });

    it('CREATE rejects duplicate email', async () => {
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          email,
          name: 'Dup',
          password: 'TempPass123!',
          role: 'USER',
        },
      });
      assert.equal(res.status, 409);
      assert.ok(res.data.error);
    });

    it('CREATE rejects unknown role', async () => {
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          email: `badrole.${unique()}@crud.test.local`,
          name: 'Bad Role',
          password: 'TempPass123!',
          role: 'NO_SUCH_ROLE',
        },
      });
      assert.equal(res.status, 400);
    });

    it('READ users list includes created user (no password leaked)', async () => {
      const res = await api(`/api/users?page=1&limit=50&search=${encodeURIComponent(email)}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.documents));
      const found = res.data.documents.find((u) => u.email === email);
      assert.ok(found, 'created user not found in list');
      assert.equal(found.role, 'USER');
      assert.equal(found.password, undefined);
    });

    it('UPDATE user name', async () => {
      const res = await api(`/api/users/${userId}`, {
        method: 'PUT',
        body: { name: 'CRUD User Updated', role: 'USER' },
      });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      const list = await api(`/api/users?search=${encodeURIComponent(email)}`);
      const found = list.data.documents.find((u) => String(u._id) === userId);
      assert.equal(found.name, 'CRUD User Updated');
    });

    it('UPDATE password', async () => {
      const res = await api(`/api/users/${userId}/password`, {
        method: 'PUT',
        body: { password: 'NewPass123!' },
      });
      assert.equal(res.status, 200, JSON.stringify(res.data));
    });

    it('DELETE user', async () => {
      const res = await api(`/api/users/${userId}`, { method: 'DELETE' });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      const list = await api(`/api/users?search=${encodeURIComponent(email)}`);
      const found = (list.data.documents || []).find((u) => String(u._id) === userId);
      assert.equal(found, undefined);
    });

    it('DELETE unknown user returns 404', async () => {
      const res = await api(`/api/users/${new ObjectId().toHexString()}`, { method: 'DELETE' });
      assert.equal(res.status, 404);
    });
  });

  describe('Roles CRUD', () => {
    let roleId = '';
    const roleName = `CRUD_TEST_${unique()}`;

    it('CREATE role', async () => {
      const res = await api('/api/roles', {
        method: 'POST',
        body: {
          name: roleName,
          permissions: defaultPermissions(),
        },
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.ok(res.data._id);
      roleId = String(res.data._id);
    });

    it('CREATE duplicate role returns 409', async () => {
      const res = await api('/api/roles', {
        method: 'POST',
        body: { name: roleName, permissions: {} },
      });
      assert.equal(res.status, 409);
    });

    it('READ roles list finds role', async () => {
      const res = await api(`/api/roles?page=1&limit=50&search=${encodeURIComponent(roleName)}`);
      assert.equal(res.status, 200);
      assert.equal(typeof res.data.hasStore, 'boolean');
      const found = res.data.documents.find((r) => r.name === roleName);
      assert.ok(found);
    });

    it('UPDATE role permissions', async () => {
      const permissions = defaultPermissions();
      permissions.MARKETPLACE = { USE: true };
      const res = await api(`/api/roles/${roleId}`, {
        method: 'PUT',
        body: { permissions },
      });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      const list = await api(`/api/roles?search=${encodeURIComponent(roleName)}`);
      const found = list.data.documents.find((r) => String(r._id) === roleId);
      assert.equal(found.permissions.MARKETPLACE.USE, true);
    });

    it('DELETE custom role', async () => {
      const res = await api(`/api/roles/${roleId}`, { method: 'DELETE' });
      assert.equal(res.status, 200, JSON.stringify(res.data));
    });

    it('DELETE protected ADMIN role is forbidden', async () => {
      const list = await api('/api/roles?search=ADMIN&limit=10');
      const adminRole = list.data.documents.find((r) => r.name === 'ADMIN');
      assert.ok(adminRole, 'ADMIN role missing');
      const res = await api(`/api/roles/${adminRole._id}`, { method: 'DELETE' });
      assert.equal(res.status, 403);
    });
  });

  describe('MCP Servers CRUD', () => {
    let mcpId = '';
    const serverName = `crud-test-${unique()}`;

    it('CREATE mcp server', async () => {
      const res = await api('/api/mcpservers', {
        method: 'POST',
        body: {
          serverName,
          seedSource: TEST_TAG,
          config: {
            title: serverName,
            description: 'CRUD test MCP',
            type: 'streamable-http',
            url: 'https://example.local/mcp/crud',
            capabilities: { tools: {} },
          },
        },
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.ok(res.data._id);
      mcpId = String(res.data._id);
    });

    it('READ mcp list finds server', async () => {
      const res = await api(
        `/api/mcpservers?page=1&limit=50&search=${encodeURIComponent(serverName)}`,
      );
      assert.equal(res.status, 200);
      const found = res.data.documents.find((s) => s.serverName === serverName);
      assert.ok(found);
      assert.equal(found.config?.url, 'https://example.local/mcp/crud');
    });

    it('UPDATE mcp server', async () => {
      const res = await api(`/api/mcpservers/${mcpId}`, {
        method: 'PUT',
        body: {
          serverName,
          seedSource: TEST_TAG,
          config: {
            title: serverName,
            description: 'CRUD test MCP updated',
            type: 'streamable-http',
            url: 'https://example.local/mcp/crud-updated',
            capabilities: { tools: {} },
          },
        },
      });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      const list = await api(`/api/mcpservers?search=${encodeURIComponent(serverName)}`);
      const found = list.data.documents.find((s) => String(s._id) === mcpId);
      assert.equal(found.config.description, 'CRUD test MCP updated');
      assert.equal(found.config.url, 'https://example.local/mcp/crud-updated');
    });

    it('DELETE mcp server', async () => {
      const res = await api(`/api/mcpservers/${mcpId}`, { method: 'DELETE' });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      const list = await api(`/api/mcpservers?search=${encodeURIComponent(serverName)}`);
      const found = (list.data.documents || []).find((s) => String(s._id) === mcpId);
      assert.equal(found, undefined);
    });

    it('UPDATE invalid id returns 400', async () => {
      const res = await api('/api/mcpservers/not-an-id', {
        method: 'PUT',
        body: { serverName: 'x' },
      });
      assert.equal(res.status, 400);
    });
  });

  describe('Pagination', () => {
    it('users pagination meta is consistent', async () => {
      const res = await api('/api/users?page=1&limit=10');
      assert.equal(res.status, 200);
      assert.equal(res.data.page, 1);
      assert.equal(res.data.pageSize, 10);
      assert.equal(typeof res.data.total, 'number');
      assert.equal(typeof res.data.totalPages, 'number');
      assert.ok(res.data.documents.length <= 10);
    });

    it('roles and mcp expose pagination fields', async () => {
      const roles = await api('/api/roles?page=1&limit=5');
      const mcp = await api('/api/mcpservers?page=1&limit=5');
      assert.equal(roles.status, 200);
      assert.equal(mcp.status, 200);
      assert.ok('totalPages' in roles.data);
      assert.ok('totalPages' in mcp.data);
    });
  });
});
