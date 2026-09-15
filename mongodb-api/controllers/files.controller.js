const File = require('../models/file.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');
const { attachUserIdentity, resolveIdentityFilter } = require('../services/userLookup');

function summarizeFile(doc) {
  if (!doc) return null;
  return {
    _id: doc._id,
    file_id: doc.file_id,
    filename: doc.filename,
    filepath: doc.filepath,
    bytes: doc.bytes,
    type: doc.type,
    user: doc.user,
    userUsername: doc.userUsername,
    userName: doc.userName,
    userEmail: doc.userEmail,
    conversationId: doc.conversationId,
    messageId: doc.messageId,
    embedded: doc.embedded,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const getFiles = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : '';
    const sortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir.trim() : 'desc';

    const identity = await resolveIdentityFilter(user);
    if (identity.active && identity.empty) {
      return res.json(paginatedResponse({ documents: [], total: 0, page, limit }));
    }

    const { documents, total } = await File.list({
      limit,
      skip,
      search,
      userIds: identity.active ? identity.idStrings : null,
      sortBy,
      sortDir,
    });
    const enriched = await attachUserIdentity(documents, 'user');
    return res.json(
      paginatedResponse({
        documents: enriched.map(summarizeFile),
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    return fromException(res, error);
  }
};

const getFileById = async (req, res) => {
  try {
    const doc = await File.findById(req.params.id);
    if (!doc) return sendError(res, 404, 'File not found');
    const [enriched] = await attachUserIdentity([doc], 'user');
    return res.json({ document: summarizeFile(enriched) });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getFiles,
  getFileById,
};
