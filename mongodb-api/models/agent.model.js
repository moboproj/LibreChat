const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const COLLECTION = 'agents';

function agentsRead() {
  return getReadDB().collection(COLLECTION);
}

function agentsWrite() {
  return getWriteDB().collection(COLLECTION);
}

async function list({ limit = 10, skip = 0, search = '', mcp = '' } = {}) {
  const filter = {};
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ name: regex }, { id: regex }, { provider: regex }, { model: regex }];
  }
  if (mcp) {
    filter.mcpServerNames = mcp;
  }

  const [documents, total] = await Promise.all([
    agentsRead()
      .find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    agentsRead().countDocuments(filter),
  ]);

  return { documents, total };
}

async function listByMcpServer(serverName, { limit = 50 } = {}) {
  return agentsRead()
    .find({ mcpServerNames: serverName })
    .project({
      _id: 1,
      id: 1,
      name: 1,
      provider: 1,
      model: 1,
      mcpServerNames: 1,
      author: 1,
      authorName: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

async function countByMcpServers(serverNames = []) {
  if (!serverNames.length) return new Map();
  const rows = await agentsRead()
    .aggregate([
      { $match: { mcpServerNames: { $in: serverNames } } },
      { $unwind: '$mcpServerNames' },
      { $match: { mcpServerNames: { $in: serverNames } } },
      { $group: { _id: '$mcpServerNames', count: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id, row.count]));
}

async function findByIdOrAgentId(id) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
    const byOid = await agentsRead().findOne({ _id: new ObjectId(id) });
    if (byOid) return byOid;
  }
  return agentsRead().findOne({ id });
}

async function findByAgentId(agentId) {
  return agentsRead().findOne({ id: agentId });
}

async function create(doc) {
  return agentsWrite().insertOne(doc);
}

async function updateByMongoId(id, update) {
  if (!ObjectId.isValid(id)) {
    return { matchedCount: 0 };
  }
  return agentsWrite().updateOne({ _id: new ObjectId(id) }, update);
}

async function deleteByMongoId(id) {
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }
  return agentsWrite().deleteOne({ _id: new ObjectId(id) });
}

async function countAll() {
  return agentsRead().countDocuments();
}

module.exports = {
  list,
  listByMcpServer,
  countByMcpServers,
  findByIdOrAgentId,
  findByAgentId,
  create,
  updateByMongoId,
  deleteByMongoId,
  countAll,
};
