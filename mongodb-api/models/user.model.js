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

async function findById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return usersRead().findOne({ _id: new ObjectId(id) });
}

async function list({ limit = 50 } = {}) {
  return usersRead()
    .find({})
    .project({ password: 0 })
    .limit(limit)
    .sort({ createdAt: -1 })
    .toArray();
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
  findById,
  list,
  create,
  updateById,
  deleteById,
  countAll,
  countCreatedSince,
};
