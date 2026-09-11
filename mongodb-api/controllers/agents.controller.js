const { ObjectId } = require('mongodb');
const Agent = require('../models/agent.model');
const User = require('../models/user.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');
const { extractMcpServerNamesFromTools } = require('../services/agentCatalog');

function summarizeAgent(doc) {
  if (!doc) return null;
  return {
    _id: doc._id,
    id: doc.id,
    name: doc.name,
    description: doc.description,
    provider: doc.provider,
    model: doc.model,
    tools: doc.tools || [],
    mcpServerNames: doc.mcpServerNames || [],
    category: doc.category,
    is_promoted: doc.is_promoted,
    author: doc.author,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function attachAuthors(documents = []) {
  const authorIds = [
    ...new Set(documents.map((doc) => (doc?.author ? String(doc.author) : null)).filter(Boolean)),
  ];
  if (!authorIds.length) return documents.map(summarizeAgent);

  const users = await Promise.all(authorIds.map((id) => User.findById(id)));
  const map = new Map(
    users
      .filter(Boolean)
      .map((user) => [String(user._id), { email: user.email, name: user.name || user.email }]),
  );

  return documents.map((doc) => {
    const summary = summarizeAgent(doc);
    const info = doc?.author ? map.get(String(doc.author)) : null;
    if (!info) return summary;
    return {
      ...summary,
      authorEmail: info.email,
      authorName: summary.authorName || info.name,
    };
  });
}

async function attachAuthor(doc) {
  if (!doc?.author) return doc;
  try {
    const user = await User.findById(String(doc.author));
    if (user) {
      return {
        ...doc,
        authorEmail: user.email,
        authorName: doc.authorName || user.name || user.email,
      };
    }
  } catch {
    /* ignore lookup errors */
  }
  return doc;
}

function generateAgentId() {
  return `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildAgentPayload(body, { isCreate = false, existing = null, authorId, authorName } = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : existing?.name || '';
  const provider =
    typeof body.provider === 'string' ? body.provider.trim() : existing?.provider || '';
  const model = typeof body.model === 'string' ? body.model.trim() : existing?.model || '';

  if (!name) {
    const error = new Error('El nombre del agente es obligatorio');
    error.status = 400;
    throw error;
  }
  if (!provider) {
    const error = new Error('El provider es obligatorio');
    error.status = 400;
    throw error;
  }
  if (!model) {
    const error = new Error('El model es obligatorio');
    error.status = 400;
    throw error;
  }

  const tools = body.tools !== undefined ? toStringArray(body.tools) : existing?.tools || [];
  // LibreChat-style: MCP lives inside tools[]; mcpServerNames is derived.
  const mcpServerNames = extractMcpServerNamesFromTools(tools);

  const payload = {
    name,
    provider,
    model,
    description:
      body.description !== undefined ? String(body.description || '') : existing?.description || '',
    instructions:
      body.instructions !== undefined
        ? String(body.instructions || '')
        : existing?.instructions || '',
    tools,
    mcpServerNames,
    category:
      body.category !== undefined
        ? String(body.category || 'general').trim() || 'general'
        : existing?.category || 'general',
    is_promoted:
      body.is_promoted !== undefined ? Boolean(body.is_promoted) : Boolean(existing?.is_promoted),
    model_parameters:
      body.model_parameters !== undefined ? body.model_parameters : existing?.model_parameters,
    conversation_starters:
      body.conversation_starters !== undefined
        ? toStringArray(body.conversation_starters)
        : existing?.conversation_starters || [],
    updatedAt: new Date(),
  };

  if (isCreate) {
    payload.id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : generateAgentId();
    payload.author = authorId;
    payload.authorName = authorName || undefined;
    payload.createdAt = new Date();
    payload.versions = [];
    payload.edges = [];
  }

  return payload;
}

function resolveAuthorObjectId(req) {
  const raw = req.user?.id || req.user?._id;
  if (!raw || !ObjectId.isValid(String(raw))) {
    const error = new Error('No se pudo resolver el autor del agente (usuario admin inválido)');
    error.status = 400;
    throw error;
  }
  return new ObjectId(String(raw));
}

const getAgents = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const mcp = typeof req.query.mcp === 'string' ? req.query.mcp.trim() : '';
    const { documents, total } = await Agent.list({ limit, skip, search, mcp });
    const enriched = await attachAuthors(documents);
    return res.json(
      paginatedResponse({
        documents: enriched,
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    return fromException(res, error);
  }
};

const getAgentById = async (req, res) => {
  try {
    const doc = await Agent.findByIdOrAgentId(req.params.id);
    if (!doc) {
      return sendError(res, 404, 'Agent not found');
    }
    const withAuthor = await attachAuthor(doc);
    return res.json({ document: withAuthor });
  } catch (error) {
    return fromException(res, error);
  }
};

const createAgent = async (req, res) => {
  try {
    const authorId = resolveAuthorObjectId(req);
    const adminUser = await User.findById(String(authorId));
    const payload = buildAgentPayload(req.body, {
      isCreate: true,
      authorId,
      authorName: adminUser?.name || adminUser?.email,
    });

    const existing = await Agent.findByAgentId(payload.id);
    if (existing) {
      return sendError(res, 409, `Ya existe un agente con id ${payload.id}`);
    }

    const result = await Agent.create(payload);
    return res.status(201).json({ _id: result.insertedId, id: payload.id });
  } catch (error) {
    return fromException(res, error);
  }
};

const updateAgent = async (req, res) => {
  try {
    const current = await Agent.findByIdOrAgentId(req.params.id);
    if (!current) {
      return sendError(res, 404, 'Agent not found');
    }

    const payload = buildAgentPayload(req.body, { existing: current });
    // Never allow changing immutable id via update body
    delete payload.id;
    delete payload.author;
    delete payload.createdAt;

    const result = await Agent.updateByMongoId(current._id, { $set: payload });
    if (result.matchedCount === 0) {
      return sendError(res, 404, 'Agent not found');
    }

    return res.json({ message: 'Agent updated', id: current.id });
  } catch (error) {
    return fromException(res, error);
  }
};

const deleteAgent = async (req, res) => {
  try {
    const current = await Agent.findByIdOrAgentId(req.params.id);
    if (!current) {
      return sendError(res, 404, 'Agent not found');
    }

    const result = await Agent.deleteByMongoId(current._id);
    if (result.deletedCount === 0) {
      return sendError(res, 404, 'Agent not found');
    }

    return res.json({ message: 'Agent deleted', id: current.id });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
};
