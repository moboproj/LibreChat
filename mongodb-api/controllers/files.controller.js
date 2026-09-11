const File = require('../models/file.model');
const User = require('../models/user.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');

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
    conversationId: doc.conversationId,
    messageId: doc.messageId,
    embedded: doc.embedded,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function attachUserEmail(doc) {
  if (!doc?.user) return doc;
  try {
    const user = await User.findById(String(doc.user));
    if (user) {
      return {
        ...doc,
        userEmail: user.email,
        userName: user.name || user.email,
      };
    }
  } catch {
    /* ignore */
  }
  return doc;
}

const getFiles = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const { documents, total } = await File.list({ limit, skip, search, user });
    const enriched = await Promise.all(documents.map((doc) => attachUserEmail(summarizeFile(doc))));
    return res.json(paginatedResponse({ documents: enriched, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

const getFileById = async (req, res) => {
  try {
    const doc = await File.findById(req.params.id);
    if (!doc) return sendError(res, 404, 'File not found');
    const enriched = await attachUserEmail(summarizeFile(doc));
    return res.json({ document: enriched });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getFiles,
  getFileById,
};
