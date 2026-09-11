const { ObjectId } = require('mongodb');
const { getReadDB } = require('../config/db');

const COLLECTION = 'transactions';

function txRead() {
  return getReadDB().collection(COLLECTION);
}

function buildMatch({ since = null, user = '', model = '', tokenType = '' } = {}) {
  const match = {};
  if (since) match.createdAt = { $gte: since };
  if (user) {
    if (ObjectId.isValid(user)) {
      match.user = new ObjectId(user);
    } else {
      match.user = user;
    }
  }
  if (model) match.model = model;
  if (tokenType) match.tokenType = tokenType;
  return match;
}

async function list({
  limit = 10,
  skip = 0,
  search = '',
  since = null,
  user = '',
  model = '',
  tokenType = '',
} = {}) {
  const filter = buildMatch({ since, user, model, tokenType });
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [
      { model: regex },
      { conversationId: regex },
      { messageId: regex },
      { tokenType: regex },
    ];
  }

  const [documents, total] = await Promise.all([
    txRead().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    txRead().countDocuments(filter),
  ]);
  return { documents, total };
}

async function summary({ since = null, user = '' } = {}) {
  const match = buildMatch({ since, user });
  const pipeline = [];
  if (Object.keys(match).length) pipeline.push({ $match: match });

  const [byType, byModel, byUser, totals] = await Promise.all([
    txRead()
      .aggregate([
        ...pipeline,
        {
          $group: {
            _id: '$tokenType',
            total: { $sum: { $abs: '$rawAmount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray(),
    txRead()
      .aggregate([
        ...pipeline,
        { $group: { _id: '$model', total: { $sum: { $abs: '$rawAmount' } }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 15 },
      ])
      .toArray(),
    txRead()
      .aggregate([
        ...pipeline,
        {
          $group: {
            _id: '$user',
            totalTokens: { $sum: { $abs: '$rawAmount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalTokens: -1 } },
        { $limit: 15 },
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
            count: 1,
            name: { $arrayElemAt: ['$userInfo.name', 0] },
            email: { $arrayElemAt: ['$userInfo.email', 0] },
          },
        },
      ])
      .toArray(),
    txRead()
      .aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            totalTokens: { $sum: { $abs: '$rawAmount' } },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  return {
    totals: totals[0] || { totalTokens: 0, count: 0 },
    byType,
    byModel,
    byUser,
  };
}

async function usageForUser(userId, { since = null } = {}) {
  const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  if (!oid) {
    return {
      totals: { totalTokens: 0, count: 0 },
      byType: [],
      byModel: [],
      recent: [],
    };
  }

  const match = { user: oid };
  if (since) match.createdAt = { $gte: since };

  const [summaryRows, byType, byModel, recent] = await Promise.all([
    txRead()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: { $abs: '$rawAmount' } },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    txRead()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$tokenType',
            total: { $sum: { $abs: '$rawAmount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray(),
    txRead()
      .aggregate([
        { $match: match },
        { $group: { _id: '$model', total: { $sum: { $abs: '$rawAmount' } }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    txRead().find(match).sort({ createdAt: -1 }).limit(20).toArray(),
  ]);

  return {
    totals: summaryRows[0] || { totalTokens: 0, count: 0 },
    byType,
    byModel,
    recent,
  };
}

module.exports = {
  list,
  summary,
  usageForUser,
};
