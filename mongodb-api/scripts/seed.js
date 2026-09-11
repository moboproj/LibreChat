/**
 * Admin-panel local seeder.
 *
 * Seeds (tagged seedSource: 'admin-panel'):
 * - roles (ADMIN/USER/STORE + extras for pagination)
 * - users (from jsonCompareDB/users.json and/or synthetic admin)
 * - mcpservers (from jsonCompareDB/mcpservers78.json)
 * - conversations, messages, transactions (synthetic, linked to users)
 * - light agents/files stubs for /api/stats counts
 *
 * Usage (from mongodb-api/):
 *   npm run seed
 *   npm run seed -- --reset
 *   npm run seed -- --no-import
 *   npm run seed -- --sanitize
 *
 * Env: MONGODB_URI / MONGODB_URI_PRIMARY (same as API), defaults to LibreChat local.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { ObjectId, MongoClient } = require('mongodb');

// Load env files without forcing docker hostname for host-side seed.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.admin') });
require('dotenv').config();

function resolveSeedUri() {
  if (process.env.SEED_MONGODB_URI) return process.env.SEED_MONGODB_URI.trim();
  const fromEnv = (process.env.MONGODB_URI_PRIMARY || process.env.MONGODB_URI || '').trim();
  if (!fromEnv) return 'mongodb://127.0.0.1:27017/LibreChat';
  // Host machine cannot resolve compose service names.
  return fromEnv
    .replace('://mongodb:', '://127.0.0.1:')
    .replace('://chat-mongodb:', '://127.0.0.1:');
}

const SEED_SOURCE = 'admin-panel';
const ROOT = path.resolve(__dirname, '../..');
const USERS_DUMP = path.join(ROOT, 'jsonCompareDB', 'users.json');
const MCP_DUMP = path.join(ROOT, 'jsonCompareDB', 'mcpservers78.json');

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const NO_IMPORT = args.has('--no-import');
const SANITIZE = args.has('--sanitize');

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.0-flash'];
const ENDPOINTS = ['openAI', 'anthropic', 'google', 'agents'];

function revive(value) {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string') return new ObjectId(value.$oid);
    if (typeof value.$date === 'string') return new Date(value.$date);
    if (typeof value.$numberLong === 'string') return Number(value.$numberLong);
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = revive(nested);
    }
    return out;
  }
  return value;
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip missing dump: ${filePath}`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return revive(raw);
}

function daysAgo(n, hour = 12) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function defaultPermissions(elevated = false) {
  return {
    BOOKMARKS: { USE: true },
    PROMPTS: { USE: true, CREATE: true, SHARE: elevated, SHARE_PUBLIC: false },
    MEMORIES: { USE: true, CREATE: true, UPDATE: true, READ: true, OPT_OUT: true },
    AGENTS: { USE: true, CREATE: elevated, SHARE: elevated, SHARE_PUBLIC: false },
    MULTI_CONVO: { USE: true },
    TEMPORARY_CHAT: { USE: true },
    RUN_CODE: { USE: true },
    WEB_SEARCH: { USE: true },
    PEOPLE_PICKER: {
      VIEW_USERS: elevated,
      VIEW_GROUPS: elevated,
      VIEW_ROLES: elevated,
    },
    MARKETPLACE: { USE: false },
    FILE_SEARCH: { USE: true },
    FILE_CITATIONS: { USE: true },
    MCP_SERVERS: { USE: true, CREATE: elevated, SHARE: false, SHARE_PUBLIC: false },
    REMOTE_AGENTS: { USE: false, CREATE: false, SHARE: false, SHARE_PUBLIC: false },
  };
}

function buildRoles() {
  const now = new Date();
  const base = [
    { name: 'ADMIN', permissions: defaultPermissions(true) },
    { name: 'USER', permissions: defaultPermissions(false) },
    { name: 'STORE', permissions: defaultPermissions(false) },
  ];
  for (let i = 1; i <= 12; i += 1) {
    base.push({
      name: `CUSTOM_ROLE_${String(i).padStart(2, '0')}`,
      permissions: defaultPermissions(i % 3 === 0),
    });
  }
  return base.map((role) => ({
    ...role,
    seedSource: SEED_SOURCE,
    createdAt: now,
    updatedAt: now,
  }));
}

function sanitizeUser(user, index) {
  if (!SANITIZE) return user;
  const id = String(user._id);
  return {
    ...user,
    name: `Seed User ${index + 1}`,
    username: `seeduser${index + 1}`,
    email: `seed.user.${index + 1}@example.local`,
    openidId: undefined,
    idOnTheSource: undefined,
    avatar: null,
    seedSource: SEED_SOURCE,
    seedOriginalId: id,
  };
}

async function clearSeeded(db) {
  const collections = [
    'roles',
    'users',
    'mcpservers',
    'conversations',
    'messages',
    'transactions',
    'agents',
    'files',
  ];
  for (const name of collections) {
    const result = await db.collection(name).deleteMany({ seedSource: SEED_SOURCE });
    console.log(`reset ${name}: deleted ${result.deletedCount}`);
  }
}

async function upsertRoles(db) {
  const roles = buildRoles();
  let upserted = 0;
  for (const role of roles) {
    await db.collection('roles').updateOne({ name: role.name }, { $set: role }, { upsert: true });
    upserted += 1;
  }
  console.log(`roles: upserted ${upserted}`);
  return roles;
}

async function ensureLoginAdmin(db) {
  const email = 'admin@seed.local';
  const passwordHash = await bcrypt.hash('AdminSeed123!', 10);
  const now = new Date();
  const doc = {
    email,
    name: 'Seed Admin',
    username: 'seedadmin',
    password: passwordHash,
    provider: 'local',
    role: 'ADMIN',
    emailVerified: true,
    seedSource: SEED_SOURCE,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('users').updateOne({ email }, { $set: doc }, { upsert: true });
  console.log(`users: ensured login admin ${email} / AdminSeed123!`);
  return db.collection('users').findOne({ email });
}

async function importUsers(db) {
  if (NO_IMPORT) {
    console.log('users: skipped dump import (--no-import)');
    return [];
  }
  const dump = readJsonArray(USERS_DUMP);
  let count = 0;
  for (let i = 0; i < dump.length; i += 1) {
    const user = sanitizeUser({ ...dump[i], seedSource: SEED_SOURCE }, i);
    if (!user.email) continue;
    user.email = String(user.email).toLowerCase();
    await db.collection('users').updateOne({ _id: user._id }, { $set: user }, { upsert: true });
    count += 1;
  }
  console.log(`users: imported ${count} from dump`);
  return dump;
}

async function importMcp(db, authorId) {
  if (NO_IMPORT) {
    console.log('mcpservers: skipped dump import (--no-import)');
    return 0;
  }
  const dump = readJsonArray(MCP_DUMP);
  let count = 0;
  for (const server of dump) {
    const doc = {
      ...server,
      author: authorId || server.author,
      seedSource: SEED_SOURCE,
      updatedAt: new Date(),
    };
    await db
      .collection('mcpservers')
      .updateOne({ _id: server._id }, { $set: doc }, { upsert: true });
    count += 1;
  }

  // Extra synthetic MCPs for pagination volume
  for (let i = 1; i <= 15; i += 1) {
    const name = `seed-mcp-${String(i).padStart(2, '0')}`;
    await db.collection('mcpservers').updateOne(
      { serverName: name, seedSource: SEED_SOURCE },
      {
        $set: {
          serverName: name,
          author: authorId,
          seedSource: SEED_SOURCE,
          config: {
            title: name,
            description: `Synthetic MCP #${i} for admin pagination`,
            type: 'streamable-http',
            url: `https://example.local/mcp/${name}`,
            tools: `${(i % 5) + 1} tools`,
            capabilities: { tools: {} },
          },
          createdAt: daysAgo(i),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }
  console.log(`mcpservers: upserted ${count}`);
  return count;
}

async function seedActivity(db, users) {
  const pool = users.slice(0, Math.min(users.length, 20));
  if (!pool.length) {
    console.warn('activity: no users available');
    return;
  }

  await db.collection('conversations').deleteMany({ seedSource: SEED_SOURCE });
  await db.collection('messages').deleteMany({ seedSource: SEED_SOURCE });
  await db.collection('transactions').deleteMany({ seedSource: SEED_SOURCE });

  const conversations = [];
  const messages = [];
  const transactions = [];

  for (let c = 0; c < 40; c += 1) {
    const user = pool[c % pool.length];
    const userId = String(user._id);
    const conversationId = `seed-convo-${c + 1}`;
    const createdAt = daysAgo(c % 30, 10 + (c % 8));
    conversations.push({
      conversationId,
      title: `Seed chat ${c + 1}`,
      user: userId,
      endpoint: ENDPOINTS[c % ENDPOINTS.length],
      model: MODELS[c % MODELS.length],
      seedSource: SEED_SOURCE,
      createdAt,
      updatedAt: createdAt,
    });

    for (let m = 0; m < 4; m += 1) {
      const isUser = m % 2 === 0;
      const messageId = `${conversationId}-msg-${m + 1}`;
      const msgAt = new Date(createdAt.getTime() + m * 60_000);
      const model = MODELS[(c + m) % MODELS.length];
      const endpoint = ENDPOINTS[(c + m) % ENDPOINTS.length];
      messages.push({
        messageId,
        conversationId,
        user: userId,
        sender: isUser ? 'User' : 'AI',
        text: isUser ? `Pregunta seed ${c + 1}.${m + 1}` : `Respuesta seed ${c + 1}.${m + 1}`,
        isCreatedByUser: isUser,
        model,
        endpoint,
        tokenCount: 40 + ((c + m) % 80),
        seedSource: SEED_SOURCE,
        createdAt: msgAt,
        updatedAt: msgAt,
      });

      if (!isUser) {
        const promptTokens = 100 + ((c * 7 + m) % 400);
        const completionTokens = 80 + ((c * 5 + m) % 300);
        transactions.push(
          {
            user: user._id,
            conversationId,
            messageId,
            tokenType: 'prompt',
            model,
            rawAmount: -promptTokens,
            tokenValue: promptTokens,
            seedSource: SEED_SOURCE,
            createdAt: msgAt,
            updatedAt: msgAt,
          },
          {
            user: user._id,
            conversationId,
            messageId,
            tokenType: 'completion',
            model,
            rawAmount: -completionTokens,
            tokenValue: completionTokens,
            seedSource: SEED_SOURCE,
            createdAt: msgAt,
            updatedAt: msgAt,
          },
        );
      }
    }
  }

  if (conversations.length) {
    await db.collection('conversations').insertMany(conversations);
  }
  if (messages.length) {
    await db.collection('messages').insertMany(messages);
  }
  if (transactions.length) {
    await db.collection('transactions').insertMany(transactions);
  }
  console.log(
    `activity: conversations=${conversations.length} messages=${messages.length} transactions=${transactions.length}`,
  );
}

async function seedStatsStubs(db, authorId) {
  await db.collection('agents').deleteMany({ seedSource: SEED_SOURCE });
  await db.collection('files').deleteMany({ seedSource: SEED_SOURCE });

  const now = new Date();
  const agents = Array.from({ length: 8 }, (_, i) => ({
    id: `seed_agent_${i + 1}`,
    name: `Seed Agent ${i + 1}`,
    provider: 'openai',
    model: MODELS[i % MODELS.length],
    author: authorId,
    seedSource: SEED_SOURCE,
    createdAt: daysAgo(i),
    updatedAt: now,
  }));
  const files = Array.from({ length: 12 }, (_, i) => ({
    filename: `seed-file-${i + 1}.txt`,
    type: 'text/plain',
    user: String(authorId),
    bytes: 1000 + i * 50,
    seedSource: SEED_SOURCE,
    createdAt: daysAgo(i),
    updatedAt: now,
  }));
  await db.collection('agents').insertMany(agents);
  await db.collection('files').insertMany(files);
  console.log(`stubs: agents=${agents.length} files=${files.length}`);
}

async function main() {
  const uri = resolveSeedUri();
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = uri.split('/').pop().split('?')[0] || 'LibreChat';
  const db = client.db(dbName);
  console.log(`Seeding database: ${dbName} @ ${uri.replace(/\/\/.*@/, '//***@')}`);

  if (RESET) {
    await clearSeeded(db);
  }

  await upsertRoles(db);
  const admin = await ensureLoginAdmin(db);
  await importUsers(db);
  await importMcp(db, admin._id);

  const users = await db
    .collection('users')
    .find({})
    .project({ _id: 1, email: 1, name: 1, role: 1 })
    .limit(100)
    .toArray();

  await seedActivity(db, users);
  await seedStatsStubs(db, admin._id);

  const counts = {};
  for (const name of [
    'users',
    'roles',
    'mcpservers',
    'conversations',
    'messages',
    'transactions',
    'agents',
    'files',
  ]) {
    counts[name] = await db.collection(name).countDocuments();
  }
  console.log('counts:', counts);
  console.log('Done. Login: admin@seed.local / AdminSeed123!');

  await client.close();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
