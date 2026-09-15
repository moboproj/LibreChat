const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

const COLLECTION = 'files';

function filesRead() {
  return getReadDB().collection(COLLECTION);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter({ search = '', userIds = null } = {}) {
  const filter = {};
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ filename: regex }, { file_id: regex }, { type: regex }];
  }
  if (Array.isArray(userIds)) {
    const values = [];
    for (const id of userIds) {
      values.push(String(id));
      if (ObjectId.isValid(String(id))) {
        values.push(new ObjectId(String(id)));
      }
    }
    filter.user = { $in: values };
  }
  return filter;
}

function buildSort({ sortBy = '', sortDir = 'desc' } = {}) {
  const dir = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;
  if (String(sortBy).toLowerCase() === 'bytes') {
    return { bytes: dir, createdAt: -1 };
  }
  return { createdAt: -1 };
}

async function list({
  limit = 10,
  skip = 0,
  search = '',
  userIds = null,
  sortBy = '',
  sortDir = 'desc',
} = {}) {
  const filter = buildFilter({ search, userIds });
  const sort = buildSort({ sortBy, sortDir });
  const [documents, total] = await Promise.all([
    filesRead().find(filter).sort(sort).skip(skip).limit(limit).toArray(),
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
