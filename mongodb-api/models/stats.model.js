const { getReadDB } = require('../config/db');

async function countCollection(name) {
  try {
    return await getReadDB().collection(name).countDocuments();
  } catch {
    return 0;
  }
}

async function countMessagesSince(date) {
  return getReadDB()
    .collection('messages')
    .countDocuments({
      createdAt: { $gte: date },
    });
}

async function messagesByDay(since) {
  return getReadDB()
    .collection('messages')
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
}

async function activeUsersByDay(since) {
  return getReadDB()
    .collection('messages')
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          users: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          _id: 1,
          activeUsers: { $size: '$users' },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
}

async function messagesByModel() {
  return getReadDB()
    .collection('messages')
    .aggregate([
      { $group: { _id: '$model', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    .toArray();
}

async function messagesByEndpoint() {
  return getReadDB()
    .collection('messages')
    .aggregate([{ $group: { _id: '$endpoint', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();
}

async function tokensByType() {
  return getReadDB()
    .collection('transactions')
    .aggregate([{ $group: { _id: '$tokenType', total: { $sum: { $abs: '$rawAmount' } } } }])
    .toArray();
}

async function topUsersByTokens() {
  return getReadDB()
    .collection('transactions')
    .aggregate([
      { $group: { _id: '$user', totalTokens: { $sum: { $abs: '$rawAmount' } } } },
      { $sort: { totalTokens: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $project: {
          _id: 1,
          totalTokens: 1,
          name: { $arrayElemAt: ['$userInfo.name', 0] },
          email: { $arrayElemAt: ['$userInfo.email', 0] },
        },
      },
    ])
    .toArray();
}

module.exports = {
  countCollection,
  countMessagesSince,
  messagesByDay,
  activeUsersByDay,
  messagesByModel,
  messagesByEndpoint,
  tokensByType,
  topUsersByTokens,
};
