const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');
const { attachUserIdentity, resolveIdentityFilter } = require('../services/userLookup');
const { attachEndpointModelLabels } = require('../services/endpointLabels');

function summarizeConversation(doc) {
  if (!doc) return null;
  return {
    _id: doc._id,
    conversationId: doc.conversationId,
    title: doc.title,
    user: doc.user,
    endpoint: doc.endpoint,
    model: doc.model,
    agent_id: doc.agent_id,
    endpointModelLabel: doc.endpointModelLabel,
    agentName: doc.agentName,
    agentModel: doc.agentModel,
    userUsername: doc.userUsername,
    userName: doc.userName,
    userEmail: doc.userEmail,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const getConversations = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';
    const endpointModel =
      typeof req.query.endpointModel === 'string' ? req.query.endpointModel.trim() : '';

    const identity = await resolveIdentityFilter(user);
    if (identity.active && identity.empty) {
      return res.json(paginatedResponse({ documents: [], total: 0, page, limit }));
    }

    const { documents, total } = await Conversation.list({
      limit,
      skip,
      search,
      userIds: identity.active ? identity.idStrings : null,
      endpointModel,
    });

    const withUsers = await attachUserIdentity(documents, 'user');
    const enriched = await attachEndpointModelLabels(withUsers);

    return res.json(
      paginatedResponse({
        documents: enriched.map(summarizeConversation),
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    return fromException(res, error);
  }
};

const getConversationById = async (req, res) => {
  try {
    const doc = await Conversation.findByIdOrConversationId(req.params.id);
    if (!doc) {
      return sendError(res, 404, 'Conversation not found');
    }
    const [withUser] = await attachUserIdentity([doc], 'user');
    const [enriched] = await attachEndpointModelLabels([withUser]);
    return res.json({ document: enriched });
  } catch (error) {
    return fromException(res, error);
  }
};

const getMessages = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const conversationId =
      typeof req.query.conversationId === 'string' ? req.query.conversationId.trim() : '';
    const user = typeof req.query.user === 'string' ? req.query.user.trim() : '';

    const { documents, total } = await Message.list({
      limit,
      skip,
      search,
      conversationId,
      user,
    });

    return res.json(paginatedResponse({ documents, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getConversations,
  getConversationById,
  getMessages,
};
