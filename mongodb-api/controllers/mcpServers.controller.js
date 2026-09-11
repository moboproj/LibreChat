const { ObjectId } = require('mongodb');
const McpServer = require('../models/mcpServer.model');

const getMCPServers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const documents = await McpServer.list({ limit });
    return res.json({ documents });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
    return res.status(500).json({ error: error.message });
  }
};

const updateMCPServer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    updateData.updatedAt = new Date();

    const result = await McpServer.updateById(id, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ message: 'Document updated' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteMCPServer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await McpServer.deleteById(id);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMCPServers,
  createMCPServer,
  updateMCPServer,
  deleteMCPServer,
};
