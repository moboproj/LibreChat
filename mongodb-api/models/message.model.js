const { getReadDB } = require('../config/db');

const COLLECTION = 'messages';

function messagesRead() {
  return getReadDB().collection(COLLECTION);
}

async function list({ limit = 10, skip = 0, search = '', conversationId = '', user = '' } = {}) {
  const filter = {};
  if (conversationId) {
    filter.conversationId = String(conversationId);
  }
  if (user) {
    filter.user = String(user);
  }
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ text: regex }, { sender: regex }, { messageId: regex }, { model: regex }];
  }

  const [documents, total] = await Promise.all([
    messagesRead().find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).toArray(),
    messagesRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function countAll() {
  return messagesRead().countDocuments();
}

module.exports = {
  list,
  countAll,
};
