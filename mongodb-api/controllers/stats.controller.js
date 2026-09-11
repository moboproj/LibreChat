const Stats = require('../models/stats.model');
const User = require('../models/user.model');
const { sendError, fromException } = require('../utils/httpError');

function resolveSince(range) {
  const now = Date.now();
  if (range === '7d') {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  // default 30d
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

const getCollectionsStats = async (req, res) => {
  try {
    const range = req.query.range === '7d' ? '7d' : '30d';
    const since = resolveSince(range);
    const last7Days = resolveSince('7d');
    const last30Days = resolveSince('30d');

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
      Stats.messagesByDay(since),
      Stats.activeUsersByDay(since),
      Stats.messagesByModel(since),
      Stats.messagesByEndpoint(since),
      Stats.tokensByType(since),
      Stats.topUsersByTokens(since),
    ]);

    return res.json({
      range,
      since,
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
    return fromException(res, error);
  }
};

module.exports = {
  getCollectionsStats,
  sendError,
};
