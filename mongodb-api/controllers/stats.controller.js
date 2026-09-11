const Stats = require('../models/stats.model');
const User = require('../models/user.model');

const getCollectionsStats = async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      totalUsers,
      totalConversations,
      totalAgents,
      totalFiles,
      totalMCPServers,
      totalRoles,
    ] = await Promise.all([
      Stats.countCollection('messages'),
      Stats.countCollection('users'),
      Stats.countCollection('conversations'),
      Stats.countCollection('agents'),
      Stats.countCollection('files'),
      Stats.countCollection('mcpservers'),
      Stats.countCollection('roles'),
    ]);

    const [
      messagesLast7Days,
      newUsersLast30Days,
      messagesByDay,
      activeUsersByDay,
      messagesByModel,
      messagesByEndpoint,
      tokensByType,
      topUsersByTokens,
    ] = await Promise.all([
      Stats.countMessagesSince(last7Days),
      User.countCreatedSince(last30Days),
      Stats.messagesByDay(last30Days),
      Stats.activeUsersByDay(last30Days),
      Stats.messagesByModel(),
      Stats.messagesByEndpoint(),
      Stats.tokensByType(),
      Stats.topUsersByTokens(),
    ]);

    return res.json({
      totals: {
        totalMessages,
        totalUsers,
        totalConversations,
        totalAgents,
        totalFiles,
        totalMCPServers,
        totalRoles,
      },
      messagesLast7Days,
      newUsersLast30Days,
      messagesByDay,
      activeUsersByDay,
      messagesByModel,
      messagesByEndpoint,
      tokensByType,
      topUsersByTokens,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCollectionsStats,
};
