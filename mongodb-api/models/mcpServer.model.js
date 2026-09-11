const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'mcpservers';

function mcpRead() {
  return getReadDB().collection(COLLECTION);
}

function mcpWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function list({ limit = 10, skip = 0, search = '' } = {}) {
  const filter = {};
  if (search) {
    filter.serverName = { $regex: search, $options: 'i' };
  }

  const [documents, total] = await Promise.all([
    mcpRead().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    mcpRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function findById(id) {
  if (!ObjectId.isValid(id)) return null;
  return mcpRead().findOne({ _id: new ObjectId(id) });
}

async function findByServerName(serverName) {
  return mcpRead().findOne({ serverName });
}

async function create(doc) {
  return mcpWrite().insertOne(doc);
}

async function updateById(id, update) {
  if (!ObjectId.isValid(id)) {
    return { matchedCount: 0 };
  }
  return mcpWrite().updateOne({ _id: new ObjectId(id) }, update);
}

async function deleteById(id) {
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }
  return mcpWrite().deleteOne({ _id: new ObjectId(id) });
}

async function countAll() {
  return mcpRead().countDocuments();
}

module.exports = {
  list,
  findById,
  findByServerName,
  create,
  updateById,
  deleteById,
  countAll,
};
