/**
 * Refresh tokens stored in Mongo so multiple pods share session state (Option A / K8s).
 * Collection is admin-panel specific and does not affect LibreChat app data.
 */
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'admin_refresh_tokens';

function tokensRead() {
  return getReadDB().collection(COLLECTION);
}

function tokensWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function add(token, meta = {}) {
  await tokensWrite().updateOne(
    { token },
    {
      $set: {
        token,
        ...meta,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
}

async function has(token) {
  const doc = await tokensRead().findOne({ token });
  return Boolean(doc);
}

async function remove(token) {
  if (!token) {
    return;
  }
  await tokensWrite().deleteOne({ token });
}

module.exports = {
  add,
  has,
  remove,
};
