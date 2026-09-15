const Transaction = require('../models/transaction.model');
const { attachUserIdentity, resolveIdentityFilter } = require('../services/userLookup');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { resolveSince, normalizeRange } = require('../utils/range');
const { fromException } = require('../utils/httpError');

async function resolveUserIdsParam(userQuery) {
  const resolved = await resolveIdentityFilter(userQuery);
  if (!resolved.active) return { active: false, userIds: null };
  if (resolved.empty) return { active: true, empty: true, userIds: [] };
  return { active: true, empty: false, userIds: resolved.objectIds };
}

const getTransactions = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const range = normalizeRange(req.query.range);
    const since = resolveSince(range);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const model = typeof req.query.model === 'string' ? req.query.model.trim() : '';
    const tokenType = typeof req.query.tokenType === 'string' ? req.query.tokenType.trim() : '';

    const userFilter = await resolveUserIdsParam(user);
    if (userFilter.active && userFilter.empty) {
      return res.json({
        ...paginatedResponse({ documents: [], total: 0, page, limit }),
        range,
        since,
      });
    }

    const { documents, total } = await Transaction.list({
      limit,
      skip,
      search,
      since,
      userIds: userFilter.userIds,
      model,
      tokenType,
    });
    const enriched = await attachUserIdentity(documents, 'user');
    return res.json({
      ...paginatedResponse({ documents: enriched, total, page, limit }),
      range,
      since,
    });
  } catch (error) {
    return fromException(res, error);
  }
};

const getTransactionsSummary = async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const since = resolveSince(range);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const userFilter = await resolveUserIdsParam(user);
    if (userFilter.active && userFilter.empty) {
      return res.json({
        range,
        since,
        totals: { totalTokens: 0, count: 0 },
        byType: [],
        byModel: [],
        byUser: [],
      });
    }

    const data = await Transaction.summary({ since, userIds: userFilter.userIds });
    return res.json({
      range,
      since,
      ...data,
    });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getTransactions,
  getTransactionsSummary,
};
