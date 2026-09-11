const crypto = require('crypto');

const PENDING_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

/** @type {Map<string, { codeVerifier: string, createdAt: number }>} */
const pendingByState = new Map();

/** @type {Map<string, { payload: object, createdAt: number }>} */
const exchangeByCode = new Map();

function prune(map, ttlMs) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (now - value.createdAt > ttlMs) {
      map.delete(key);
    }
  }
}

function putPending(state, codeVerifier) {
  prune(pendingByState, PENDING_TTL_MS);
  pendingByState.set(state, { codeVerifier, createdAt: Date.now() });
}

function takePending(state) {
  prune(pendingByState, PENDING_TTL_MS);
  const entry = pendingByState.get(state);
  if (!entry) return null;
  pendingByState.delete(state);
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) return null;
  return entry;
}

function putExchange(payload) {
  prune(exchangeByCode, EXCHANGE_TTL_MS);
  const code = crypto.randomBytes(32).toString('hex');
  exchangeByCode.set(code, { payload, createdAt: Date.now() });
  return code;
}

function takeExchange(code) {
  prune(exchangeByCode, EXCHANGE_TTL_MS);
  const entry = exchangeByCode.get(code);
  if (!entry) return null;
  exchangeByCode.delete(code);
  if (Date.now() - entry.createdAt > EXCHANGE_TTL_MS) return null;
  return entry.payload;
}

module.exports = {
  putPending,
  takePending,
  putExchange,
  takeExchange,
};
