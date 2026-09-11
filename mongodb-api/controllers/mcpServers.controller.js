const { ObjectId } = require('mongodb');
const McpServer = require('../models/mcpServer.model');
const Agent = require('../models/agent.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');

async function withAgentCounts(documents) {
  const names = documents.map((doc) => doc.serverName).filter(Boolean);
  const counts = await Agent.countByMcpServers(names);
  return documents.map((doc) => ({
    ...doc,
    agentCount: counts.get(doc.serverName) || 0,
  }));
}

const getMCPServers = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const { documents, total } = await McpServer.list({ limit, skip, search });
    const enriched = await withAgentCounts(documents);
    return res.json(paginatedResponse({ documents: enriched, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

const getMCPServerById = async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
      doc = await McpServer.findById(id);
    }
    if (!doc) {
      doc = await McpServer.findByServerName(id);
    }
    if (!doc) return sendError(res, 404, 'MCP server not found');

    const agents = await Agent.listByMcpServer(doc.serverName, { limit: 100 });
    return res.json({
      document: {
        ...doc,
        agentCount: agents.length,
        agents,
      },
    });
  } catch (error) {
    return fromException(res, error);
  }
};

const createMCPServer = async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await McpServer.create(data);
    return res.status(201).json({ _id: result.insertedId });
  } catch (error) {
    return fromException(res, error);
  }
};

const updateMCPServer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid ID format');
    }

    const updateData = { ...req.body };
    delete updateData._id;
    updateData.updatedAt = new Date();

    const result = await McpServer.updateById(id, { $set: updateData });

    if (result.matchedCount === 0) {
      return sendError(res, 404, 'Document not found');
    }

    return res.json({ message: 'Document updated' });
  } catch (error) {
    return fromException(res, error);
  }
};

const deleteMCPServer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid ID format');
    }

    const result = await McpServer.deleteById(id);

    if (result.deletedCount === 0) {
      return sendError(res, 404, 'Document not found');
    }

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getMCPServers,
  getMCPServerById,
  createMCPServer,
  updateMCPServer,
  deleteMCPServer,
};
