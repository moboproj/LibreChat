const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match users by username (employee number), email, or name.
 * Returns lean public fields keyed for enrichment.
 */
async function findUsersByIdentity(query, { limit = 50 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const regex = { $regex: escapeRegex(q), $options: 'i' };
  return getReadDB()
    .collection('users')
    .find({
      $or: [{ username: regex }, { email: regex }, { name: regex }],
    })
    .project({ password: 0 })
    .limit(limit)
    .toArray();
}

/**
 * Resolve a free-text identity filter to user id forms used across collections.
 * conversations/messages/files often store user as string; transactions as ObjectId.
 */
async function resolveIdentityFilter(query) {
  const q = String(query || '').trim();
  if (!q) {
    return { active: false, users: [], idStrings: [], objectIds: [] };
  }

  let users = await findUsersByIdentity(q);

  // Exact ObjectId still supported as fallback for ops/debug.
  if (!users.length && ObjectId.isValid(q) && String(new ObjectId(q)) === q) {
    const byId = await getReadDB()
      .collection('users')
      .findOne({ _id: new ObjectId(q) }, { projection: { password: 0 } });
    if (byId) users = [byId];
  }

  const idStrings = users.map((user) => String(user._id));
  const objectIds = users.map((user) => user._id);

  return {
    active: true,
    users,
    idStrings,
    objectIds,
    empty: users.length === 0,
  };
}

function publicUserFields(user) {
  if (!user) {
    return {
      userUsername: null,
      userName: null,
      userEmail: null,
    };
  }
  return {
    userUsername: user.username || null,
    userName: user.name || null,
    userEmail: user.email || null,
  };
}

async function usersByIds(ids = []) {
  const unique = [...new Set(ids.map((id) => (id == null ? '' : String(id))).filter(Boolean))];
  if (!unique.length) return new Map();

  const objectIds = unique
    .filter((id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id)
    .map((id) => new ObjectId(id));
  if (!objectIds.length) return new Map();

  const docs = await getReadDB()
    .collection('users')
    .find({ _id: { $in: objectIds } })
    .project({ password: 0 })
    .toArray();

  const map = new Map();
  for (const doc of docs) {
    map.set(String(doc._id), doc);
  }
  return map;
}

async function attachUserIdentity(documents = [], userField = 'user') {
  if (!documents.length) return documents;
  const ids = documents.map((doc) => doc?.[userField]).filter((id) => id != null && id !== '');
  const map = await usersByIds(ids);
  return documents.map((doc) => {
    const info = map.get(String(doc?.[userField]));
    return {
      ...doc,
      ...publicUserFields(info),
    };
  });
}

module.exports = {
  findUsersByIdentity,
  resolveIdentityFilter,
  publicUserFields,
  usersByIds,
  attachUserIdentity,
};
