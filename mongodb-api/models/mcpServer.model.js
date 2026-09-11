const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'mcpservers';

function mcpRead() {
  return getReadDB().collection(COLLECTION);
}

function mcpWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function list({ limit = 50 } = {}) {
  return mcpRead().find({}).limit(limit).sort({ createdAt: -1 }).toArray();
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
  create,
  updateById,
  deleteById,
  countAll,
};
