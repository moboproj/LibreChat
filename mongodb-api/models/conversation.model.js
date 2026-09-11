const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

const COLLECTION = 'conversations';

function conversationsRead() {
  return getReadDB().collection(COLLECTION);
}

async function list({ limit = 10, skip = 0, search = '', user = '' } = {}) {
  const filter = {};
  if (user) {
    filter.user = String(user);
  }
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ title: regex }, { conversationId: regex }, { user: regex }, { model: regex }];
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
