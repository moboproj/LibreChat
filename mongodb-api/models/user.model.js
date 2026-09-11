const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'users';

function usersRead() {
  return getReadDB().collection(COLLECTION);
}

function usersWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function findByEmail(email) {
  return usersRead().findOne({ email: String(email).toLowerCase() });
}

async function findByUsername(username) {
  const value = String(username || '').trim();
  if (!value) return null;
  return usersRead().findOne({ username: value });
}

async function findByOpenIdId(openidId) {
  const value = String(openidId || '').trim();
  if (!value) return null;
  return usersRead().findOne({ openidId: value });
}

async function findById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return usersRead().findOne({ _id: new ObjectId(id) });
}

async function list({ limit = 10, skip = 0, search = '', role = '' } = {}) {
  const filter = {};
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ email: regex }, { name: regex }, { username: regex }];
  }
  if (role) {
    filter.role = role;
  }

  const cursor = usersRead()
    .find(filter)
    .project({ password: 0 })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const [documents, total] = await Promise.all([
    cursor.toArray(),
    usersRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function countByRole(roleName) {
  return usersRead().countDocuments({ role: roleName });
}

async function listByRole(roleName, { limit = 10, skip = 0, search = '' } = {}) {
  return list({ limit, skip, search, role: roleName });
}

async function create(doc) {
  return usersWrite().insertOne(doc);
}

async function updateById(id, update) {
  if (!ObjectId.isValid(id)) {
    return { matchedCount: 0 };
  }
  return usersWrite().updateOne({ _id: new ObjectId(id) }, update);
}

async function deleteById(id) {
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }
  return usersWrite().deleteOne({ _id: new ObjectId(id) });
}

async function countAll() {
  return usersRead().countDocuments();
}

async function countCreatedSince(date) {
  return usersRead().countDocuments({ createdAt: { $gte: date } });
}

module.exports = {
  findByEmail,
  findByUsername,
  findByOpenIdId,
  findById,
  list,
  listByRole,
  countByRole,
  create,
  updateById,
  deleteById,
  countAll,
  countCreatedSince,
};
