const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

/**
 * Enrich user docs with conversation counts and last activity (messages).
 * Conversations/messages store user as string id; transactions use ObjectId.
 */
async function enrichUsers(documents = []) {
  if (!documents.length) return documents;

  const ids = documents.map((doc) => doc._id);
  const idStrings = ids.map((id) => String(id));
  const db = getReadDB();

  const [convoCounts, lastMessages, tokenTotals] = await Promise.all([
    db
      .collection('conversations')
      .aggregate([
        { $match: { user: { $in: idStrings } } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection('messages')
      .aggregate([
        { $match: { user: { $in: idStrings } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$user',
            lastActivityAt: { $first: '$createdAt' },
            messageCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection('transactions')
      .aggregate([
        { $match: { user: { $in: ids } } },
        {
          $group: {
            _id: '$user',
            totalTokens: { $sum: { $abs: '$rawAmount' } },
          },
        },
      ])
      .toArray(),
  ]);

  const convoMap = new Map(convoCounts.map((row) => [String(row._id), row.count]));
  const activityMap = new Map(lastMessages.map((row) => [String(row._id), row]));
  const tokenMap = new Map(tokenTotals.map((row) => [String(row._id), row.totalTokens]));

  return documents.map((doc) => {
    const key = String(doc._id);
    const activity = activityMap.get(key);
    return {
      ...doc,
      conversationCount: convoMap.get(key) || 0,
      messageCount: activity?.messageCount || 0,
      lastActivityAt: activity?.lastActivityAt || null,
      totalTokens: tokenMap.get(key) || 0,
    };
  });
}

async function countsForUser(userId) {
  const key = String(userId);
  const oid = ObjectId.isValid(key) ? new ObjectId(key) : null;
  const db = getReadDB();

  const [conversationCount, messageCount, lastMessage, agentsCreated] = await Promise.all([
    db.collection('conversations').countDocuments({ user: key }),
    db.collection('messages').countDocuments({ user: key }),
    db
      .collection('messages')
      .find({ user: key })
      .sort({ createdAt: -1 })
      .project({ createdAt: 1 })
      .limit(1)
      .toArray(),
    oid ? db.collection('agents').countDocuments({ author: oid }) : Promise.resolve(0),
  ]);

  return {
    conversationCount,
    messageCount,
    lastActivityAt: lastMessage[0]?.createdAt || null,
    agentsCreated,
  };
}

module.exports = {
  enrichUsers,
  countsForUser,
};
