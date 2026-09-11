function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || defaultLimit;
  if (Number.isNaN(limit) || limit < 1) limit = defaultLimit;
  limit = Math.min(limit, maxLimit);
  const skip = (page - 1) * limit;
  const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
  const search = rawSearch ? escapeRegex(rawSearch) : '';
  return { page, limit, skip, search };
}

function paginatedResponse({ documents, total, page, limit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    documents,
    total,
    page,
    pageSize: limit,
    totalPages,
  };
}

module.exports = {
  escapeRegex,
  parsePagination,
  paginatedResponse,
};
