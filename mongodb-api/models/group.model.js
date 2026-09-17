const { getReadDB } = require('../config/db');

const COLLECTION = 'groups';

function groupsRead() {
  return getReadDB().collection(COLLECTION);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list({ limit = 10, skip = 0, search = '' } = {}) {
  const filter = {};
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }, { description: regex }];
  }

  const [documents, total] = await Promise.all([
    groupsRead().find(filter).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
    groupsRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function findById(id) {
  const { ObjectId } = require('mongodb');
  if (!ObjectId.isValid(id)) return null;
  return groupsRead().findOne({ _id: new ObjectId(id) });
}

module.exports = {
  list,
  findById,
};
