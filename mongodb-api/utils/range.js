function resolveSince(range) {
  const now = Date.now();
  if (range === '7d') {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === 'all') {
    return null;
  }
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function normalizeRange(range) {
  if (range === '7d' || range === 'all') return range;
  return '30d';
}

module.exports = {
  resolveSince,
  normalizeRange,
};
