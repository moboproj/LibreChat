/**
 * Smoke checks against a running mongodb-api (default :8082).
 * Requires seeded admin: admin@seed.local / AdminSeed123!
 *
 *   npm run smoke
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:8082';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  const health = await req('/health');
  if (health.status !== 200) throw new Error('health failed');

  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@seed.local', password: 'AdminSeed123!' },
  });
  if (!login.data.accessToken) {
    throw new Error(`login failed: ${JSON.stringify(login.data)}`);
  }
  const token = login.data.accessToken;

  const users = await req('/api/users?page=1&limit=10', { token });
  if (!Array.isArray(users.data.documents)) throw new Error('users pagination failed');

  const roles = await req('/api/roles?page=1&limit=10', { token });
  if (!Array.isArray(roles.data.documents)) throw new Error('roles pagination failed');

  const mcp = await req('/api/mcpservers?page=1&limit=10', { token });
  if (!Array.isArray(mcp.data.documents)) throw new Error('mcp pagination failed');

  const stats = await req('/api/stats?range=7d', { token });
  if (!stats.data.totals) throw new Error('stats failed');

  console.log('smoke ok', {
    users: users.data.total,
    roles: roles.data.total,
    mcp: mcp.data.total,
    messages: stats.data.totals.totalMessages,
    transactionsHint: stats.data.tokensByType?.length,
  });
}

main().catch((error) => {
  console.error('smoke failed:', error.message || error);
  process.exit(1);
});
