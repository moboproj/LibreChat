const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { resolveSince, normalizeRange } = require('../utils/range');
const { fromException } = require('../utils/httpError');

async function attachUserInfo(docs) {
  const ids = [...new Set(docs.map((doc) => (doc.user ? String(doc.user) : null)).filter(Boolean))];
  const users = await Promise.all(ids.map((id) => User.findById(id)));
  const map = new Map(
    users.filter(Boolean).map((user) => [String(user._id), { email: user.email, name: user.name }]),
  );
  return docs.map((doc) => {
    const info = map.get(String(doc.user));
    return {
      ...doc,
      userEmail: info?.email || null,
      userName: info?.name || null,
    };
  });
}

const getTransactions = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const range = normalizeRange(req.query.range);
    const since = resolveSince(range);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const model = typeof req.query.model === 'string' ? req.query.model.trim() : '';
    const tokenType = typeof req.query.tokenType === 'string' ? req.query.tokenType.trim() : '';

    const { documents, total } = await Transaction.list({
      limit,
      skip,
      search,
      since,
      user,
      model,
      tokenType,
    });
    const enriched = await attachUserInfo(documents);
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
    const data = await Transaction.summary({ since, user });
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
