const { getReadDB } = require('../config/db');

const COLLECTION = 'conversations';

function conversationsRead() {
  return getReadDB().collection(COLLECTION);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list({
  limit = 10,
  skip = 0,
  search = '',
  userIds = null,
  endpointModel = '',
} = {}) {
  const filter = {};
  if (Array.isArray(userIds)) {
    filter.user = { $in: userIds.map(String) };
  }
  if (endpointModel) {
    const regex = { $regex: escapeRegex(endpointModel), $options: 'i' };
    filter.$and = [...(filter.$and || []), { $or: [{ endpoint: regex }, { model: regex }] }];
  }
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ title: regex }, { conversationId: regex }, { user: regex }, { model: regex }] },
    ];
  }

  const [documents, total] = await Promise.all([
    conversationsRead()
      .find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    conversationsRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function findByIdOrConversationId(id) {
  const { ObjectId } = require('mongodb');
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
    const byOid = await conversationsRead().findOne({ _id: new ObjectId(id) });
    if (byOid) return byOid;
  }
  return conversationsRead().findOne({ conversationId: id });
}

async function countAll() {
  return conversationsRead().countDocuments();
}

module.exports = {
  list,
  findByIdOrConversationId,
  countAll,
};
