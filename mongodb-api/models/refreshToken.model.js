/**
 * Refresh tokens stored in Mongo so multiple pods share session state (Option A / K8s).
 * Collection is admin-panel specific and does not affect LibreChat app data.
 * Documents expire via TTL index on `expiresAt`.
 */
const { getReadDB, getWriteDB } = require('../config/db');
const config = require('../config/env');

const COLLECTION = 'admin_refresh_tokens';

function tokensRead() {
  return getReadDB().collection(COLLECTION);
}

function tokensWrite() {
  return getWriteDB().collection(COLLECTION);
}

function refreshExpiryDate() {
  // jwtRefreshExpiresIn is like '7d' — approximate for TTL
  const match = String(config.jwtRefreshExpiresIn || '7d').match(/^(\d+)([smhd])$/i);
  const amount = match ? Number(match[1]) : 7;
  const unit = match ? match[2].toLowerCase() : 'd';
  const unitMs = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const ms = (unitMs[unit] || unitMs.d) * amount;
  return new Date(Date.now() + ms);
}

async function add(token, meta = {}) {
  await tokensWrite().updateOne(
    { token },
    {
      $set: {
        token,
        ...meta,
        expiresAt: refreshExpiryDate(),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
}

async function has(token) {
  const doc = await tokensRead().findOne({
    token,
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
  });
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
