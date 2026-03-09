const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

// Generic route handlers to replace the dynamic /api/:collection endpoints
// for specific collections we want to manage from the admin panel

const getCollection = async (req, res, collectionName) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 50;
    const documents = await db.collection(collectionName)
      .find({})
      .limit(limit)
      .sort({ createdAt: -1 }) // Assuming most collections have this
      .toArray();
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createDocument = async (req, res, collectionName) => {
  try {
    const db = getDB();
    const data = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection(collectionName).insertOne(data);
    res.status(201).json({ _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDocument = async (req, res, collectionName) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Don't update _id
    const updateData = { ...req.body };
    delete updateData._id;
    updateData.updatedAt = new Date();

    const result = await db.collection(collectionName).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDocument = async (req, res, collectionName) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Explicit controllers for mcpservers
const getMCPServers = (req, res) => getCollection(req, res, 'mcpservers');
const createMCPServer = (req, res) => createDocument(req, res, 'mcpservers');
const updateMCPServer = (req, res) => updateDocument(req, res, 'mcpservers');
const deleteMCPServer = (req, res) => deleteDocument(req, res, 'mcpservers');

// Explicit controllers for roles
const getRoles = (req, res) => getCollection(req, res, 'roles');
const createRole = (req, res) => createDocument(req, res, 'roles');
const updateRole = (req, res) => updateDocument(req, res, 'roles');
const deleteRole = (req, res) => deleteDocument(req, res, 'roles');

// Stats endpoint: providing detailed stats for Dashboard and Statistics views
const getCollectionsStats = async (req, res) => {
  try {
    const db = getDB();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Totals
    const [
      totalMessages,
      totalUsers,
      totalConversations,
      totalAgents,
      totalFiles,
      totalMCPServers,
      totalRoles
    ] = await Promise.all([
      db.collection('messages').countDocuments(),
      db.collection('users').countDocuments(),
      db.collection('conversations').countDocuments(),
      db.collection('agents').countDocuments().catch(() => 0),
      db.collection('files').countDocuments().catch(() => 0),
      db.collection('mcpservers').countDocuments().catch(() => 0),
      db.collection('roles').countDocuments().catch(() => 0),
    ]);

    // 2. Trend data
    const messagesLast7Days = await db.collection('messages').countDocuments({
      createdAt: { $gte: last7Days }
    });
    
    const newUsersLast30Days = await db.collection('users').countDocuments({
      createdAt: { $gte: last30Days }
    });

    // 3. Messages by Day (last 30 days)
    const messagesByDay = await db.collection('messages').aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 4. Active Users by Day (last 30 days)
    const activeUsersByDay = await db.collection('messages').aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          users: { $addToSet: "$user" }
        }
      },
      {
        $project: {
          _id: 1,
          activeUsers: { $size: "$users" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 5. Messages by Model
    const messagesByModel = await db.collection('messages').aggregate([
      { $group: { _id: "$model", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // 6. Messages by Endpoint
    const messagesByEndpoint = await db.collection('messages').aggregate([
      { $group: { _id: "$endpoint", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // 7. Tokens by Type (from transactions collection)
    const tokensByType = await db.collection('transactions').aggregate([
      { $group: { _id: "$tokenType", total: { $sum: { $abs: "$rawAmount" } } } }
    ]).toArray();

    // 8. Top Users by Tokens
    const topUsersByTokens = await db.collection('transactions').aggregate([
      { $group: { _id: "$user", totalTokens: { $sum: { $abs: "$rawAmount" } } } },
      { $sort: { totalTokens: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          _id: 1,
          totalTokens: 1,
          name: { $arrayElemAt: ["$userInfo.name", 0] },
          email: { $arrayElemAt: ["$userInfo.email", 0] }
        }
      }
    ]).toArray();

    res.json({
      totals: {
        totalMessages,
        totalUsers,
        totalConversations,
        totalAgents,
        totalFiles,
        totalMCPServers,
        totalRoles
      },
      messagesLast7Days,
      newUsersLast30Days,
      messagesByDay,
      activeUsersByDay,
      messagesByModel,
      messagesByEndpoint,
      tokensByType,
      topUsersByTokens
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMCPServers,
  createMCPServer,
  updateMCPServer,
  deleteMCPServer,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getCollectionsStats
};
