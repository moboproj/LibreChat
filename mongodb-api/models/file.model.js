const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

const COLLECTION = 'files';

function filesRead() {
  return getReadDB().collection(COLLECTION);
}

function buildFilter({ search = '', user = '' } = {}) {
  const filter = {};
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ filename: regex }, { file_id: regex }, { type: regex }];
  }
  if (user) {
    const userFilter = [{ user: String(user) }];
    if (ObjectId.isValid(user)) {
      userFilter.push({ user: new ObjectId(user) });
    }
    filter.$and = [...(filter.$and || []), { $or: userFilter }];
  }
  return filter;
}

async function list({ limit = 10, skip = 0, search = '', user = '' } = {}) {
  const filter = buildFilter({ search, user });
  const [documents, total] = await Promise.all([
    filesRead().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    filesRead().countDocuments(filter),
  ]);
  return { documents, total };
}

async function findById(id) {
  if (!ObjectId.isValid(id)) return null;
  return filesRead().findOne({ _id: new ObjectId(id) });
}

async function countAll() {
  return filesRead().countDocuments();
}

module.exports = {
  list,
  findById,
  countAll,
};
