/**
 * Ensures indexes used by admin-panel list/search/stats and TTL for refresh tokens.
 * Safe to call on every API boot (failures are logged, never fatal).
 */
async function createIndexSafe(collection, keys, options = {}) {
  try {
    await collection.createIndex(keys, options);
  } catch (error) {
    console.warn(
      `[indexes] ${collection.collectionName}.${options.name || 'idx'}: ${error.message}`,
    );
  }
}

async function ensureIndexes(db) {
  await createIndexSafe(
    db.collection('users'),
    { email: 1 },
    { name: 'users_email', sparse: true },
  );
  await createIndexSafe(db.collection('users'), { createdAt: -1 }, { name: 'users_createdAt' });
  await createIndexSafe(db.collection('users'), { name: 1 }, { name: 'users_name' });
  await createIndexSafe(db.collection('users'), { role: 1 }, { name: 'users_role' });
  await createIndexSafe(
    db.collection('users'),
    { seedSource: 1 },
    {
      name: 'users_seedSource',
      sparse: true,
    },
  );

  await createIndexSafe(db.collection('roles'), { name: 1 }, { name: 'roles_name', unique: true });
  await createIndexSafe(db.collection('roles'), { createdAt: -1 }, { name: 'roles_createdAt' });

  await createIndexSafe(db.collection('mcpservers'), { serverName: 1 }, { name: 'mcp_serverName' });
  await createIndexSafe(db.collection('mcpservers'), { createdAt: -1 }, { name: 'mcp_createdAt' });

  await createIndexSafe(
    db.collection('messages'),
    { createdAt: -1 },
    { name: 'messages_createdAt' },
  );
  await createIndexSafe(
    db.collection('messages'),
    { user: 1, createdAt: -1 },
    { name: 'messages_user_createdAt' },
  );
  await createIndexSafe(
    db.collection('messages'),
    { model: 1 },
    {
      name: 'messages_model',
      sparse: true,
    },
  );
  await createIndexSafe(
    db.collection('messages'),
    { endpoint: 1 },
    {
      name: 'messages_endpoint',
      sparse: true,
    },
  );

  await createIndexSafe(
    db.collection('conversations'),
    { createdAt: -1 },
    {
      name: 'conversations_createdAt',
    },
  );
  await createIndexSafe(
    db.collection('conversations'),
    { user: 1 },
    { name: 'conversations_user' },
  );
  await createIndexSafe(
    db.collection('conversations'),
    { conversationId: 1 },
    {
      name: 'conversations_conversationId',
    },
  );

  await createIndexSafe(db.collection('transactions'), { user: 1 }, { name: 'transactions_user' });
  await createIndexSafe(
    db.collection('transactions'),
    { createdAt: -1 },
    {
      name: 'transactions_createdAt',
    },
  );
  await createIndexSafe(
    db.collection('transactions'),
    { tokenType: 1 },
    {
      name: 'transactions_tokenType',
    },
  );

  await createIndexSafe(
    db.collection('admin_refresh_tokens'),
    { token: 1 },
    {
      name: 'admin_refresh_token',
      unique: true,
    },
  );
  await createIndexSafe(
    db.collection('admin_refresh_tokens'),
    { expiresAt: 1 },
    {
      name: 'admin_refresh_expiresAt_ttl',
      expireAfterSeconds: 0,
    },
  );
}

module.exports = { ensureIndexes };
