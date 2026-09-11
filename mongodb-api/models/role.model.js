const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'roles';

function rolesRead() {
  return getReadDB().collection(COLLECTION);
}

function rolesWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function findByName(name) {
  return rolesRead().findOne({ name });
}

async function findById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return rolesRead().findOne({ _id: new ObjectId(id) });
}

async function list({ limit = 10, skip = 0, search = '' } = {}) {
  const filter = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const [documents, total] = await Promise.all([
    rolesRead().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    rolesRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function create(doc) {
  return rolesWrite().insertOne(doc);
}

async function updateById(id, update) {
  if (!ObjectId.isValid(id)) {
    return { matchedCount: 0 };
  }
  return rolesWrite().updateOne({ _id: new ObjectId(id) }, update);
}

async function deleteById(id) {
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }
  return rolesWrite().deleteOne({ _id: new ObjectId(id) });
}

async function countAll() {
  return rolesRead().countDocuments();
}

module.exports = {
  findByName,
  findById,
  list,
  create,
  updateById,
  deleteById,
  countAll,
};
