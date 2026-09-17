const Agent = require('../models/agent.model');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');
const { extractMcpServerNamesFromTools } = require('../services/agentCatalog');
const {
  PrincipalType,
  AccessRoleIds,
  AGENT_ROLE_OPTIONS,
  grantAgentAccess,
  revokeAgentAccess,
  grantOwnerPair,
  listAgentAclEntries,
  deleteAllAgentAcl,
  roleIdFromPermBits,
  toObjectId,
} = require('../services/agentAcl');

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
    avatar: doc.avatar || null,
    model_parameters: doc.model_parameters || null,
    conversation_starters: doc.conversation_starters || [],
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

function normalizeAvatar(value, existing) {
  if (value === undefined) return existing?.avatar;
  if (value === null || value === '') return null;
  if (typeof value === 'string') {
    const filepath = value.trim();
    if (!filepath) return null;
    return { filepath, source: 'url' };
  }
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  return existing?.avatar || null;
}

function normalizeModelParameters(value, existing) {
  if (value === undefined) return existing?.model_parameters;
  if (value === null || value === '') return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('model_parameters debe ser un objeto');
    error.status = 400;
    throw error;
  }
  const out = {};
  if (value.temperature !== undefined && value.temperature !== '' && value.temperature != null) {
    out.temperature = Number(value.temperature);
  }
  if (value.top_p !== undefined && value.top_p !== '' && value.top_p != null) {
    out.top_p = Number(value.top_p);
  }
  if (
    value.max_output_tokens !== undefined &&
    value.max_output_tokens !== '' &&
    value.max_output_tokens != null
  ) {
    out.max_output_tokens = Number(value.max_output_tokens);
  }
  return Object.keys(out).length ? out : null;
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
    model_parameters: normalizeModelParameters(body.model_parameters, existing),
    conversation_starters:
      body.conversation_starters !== undefined
        ? toStringArray(body.conversation_starters)
        : existing?.conversation_starters || [],
    avatar: normalizeAvatar(body.avatar, existing),
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

function resolveAdminObjectId(req) {
  const raw = req.user?.id || req.user?._id;
  const oid = toObjectId(raw);
  if (!oid) {
    const error = new Error('No se pudo resolver el usuario admin autenticado');
    error.status = 400;
    throw error;
  }
  return oid;
}

async function resolveOwnerUser(req, body) {
  const adminId = resolveAdminObjectId(req);
  const adminUser = await User.findById(String(adminId));
  const requested =
    typeof body?.ownerId === 'string' && body.ownerId.trim() ? body.ownerId.trim() : '';

  if (!requested) {
    return {
      ownerId: adminId,
      ownerUser: adminUser,
      grantedBy: adminId,
    };
  }

  const ownerUser = await User.findById(requested);
  if (!ownerUser) {
    const error = new Error('El usuario dueño seleccionado no existe');
    error.status = 400;
    throw error;
  }

  return {
    ownerId: ownerUser._id,
    ownerUser,
    grantedBy: adminId,
  };
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
    const { ownerId, ownerUser, grantedBy } = await resolveOwnerUser(req, req.body);
    const payload = buildAgentPayload(req.body, {
      isCreate: true,
      authorId: ownerId,
      authorName: ownerUser?.name || ownerUser?.email,
    });

    const existing = await Agent.findByAgentId(payload.id);
    if (existing) {
      return sendError(res, 409, `Ya existe un agente con id ${payload.id}`);
    }

    const result = await Agent.create(payload);
    try {
      await grantOwnerPair({
        userId: ownerId,
        agentMongoId: result.insertedId,
        grantedBy,
      });
    } catch (aclError) {
      await Agent.deleteByMongoId(result.insertedId).catch(() => {});
      const error = new Error(
        `Agente no creado: falló la asignación ACL de owner (${aclError.message})`,
      );
      error.status = aclError.status || 500;
      throw error;
    }

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
    delete payload.id;
    delete payload.createdAt;

    const requestedOwner =
      typeof req.body?.ownerId === 'string' && req.body.ownerId.trim()
        ? req.body.ownerId.trim()
        : '';

    if (requestedOwner) {
      const ownerUser = await User.findById(requestedOwner);
      if (!ownerUser) {
        return sendError(res, 400, 'El usuario dueño seleccionado no existe');
      }
      payload.author = ownerUser._id;
      payload.authorName = ownerUser.name || ownerUser.email;
    } else {
      delete payload.author;
      delete payload.authorName;
    }

    const result = await Agent.updateByMongoId(current._id, { $set: payload });
    if (result.matchedCount === 0) {
      return sendError(res, 404, 'Agent not found');
    }

    if (requestedOwner) {
      const adminId = resolveAdminObjectId(req);
      await grantOwnerPair({
        userId: requestedOwner,
        agentMongoId: current._id,
        grantedBy: adminId,
      });
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

    await deleteAllAgentAcl(current._id);
    return res.json({ message: 'Agent deleted', id: current.id });
  } catch (error) {
    return fromException(res, error);
  }
};

const getAgentShareMeta = async (_req, res) => {
  try {
    return res.json({ roles: AGENT_ROLE_OPTIONS });
  } catch (error) {
    return fromException(res, error);
  }
};

async function loadAgentOr404(id) {
  const doc = await Agent.findByIdOrAgentId(id);
  if (!doc) {
    const error = new Error('Agent not found');
    error.status = 404;
    throw error;
  }
  return doc;
}

const getAgentShareUsers = async (req, res) => {
  try {
    const agent = await loadAgentOr404(req.params.id);
    const { page, limit, skip, search } = parsePagination(req.query);
    const { documents, total } = await User.list({ limit, skip, search });
    const aclEntries = await listAgentAclEntries(agent._id);
    const roleByUser = new Map();
    for (const entry of aclEntries) {
      if (entry.principalType !== PrincipalType.USER) continue;
      roleByUser.set(String(entry.principalId), roleIdFromPermBits(entry.permBits));
    }

    const enriched = documents.map((user) => ({
      _id: user._id,
      username: user.username || null,
      name: user.name || null,
      email: user.email || null,
      accessRoleId: roleByUser.get(String(user._id)) || null,
    }));

    return res.json(paginatedResponse({ documents: enriched, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

const getAgentShareGroups = async (req, res) => {
  try {
    const agent = await loadAgentOr404(req.params.id);
    const { page, limit, skip, search } = parsePagination(req.query);
    const { documents, total } = await Group.list({ limit, skip, search });
    const aclEntries = await listAgentAclEntries(agent._id);
    const roleByGroup = new Map();
    for (const entry of aclEntries) {
      if (entry.principalType !== PrincipalType.GROUP) continue;
      roleByGroup.set(String(entry.principalId), roleIdFromPermBits(entry.permBits));
    }

    const enriched = documents.map((group) => ({
      _id: group._id,
      name: group.name || null,
      email: group.email || null,
      description: group.description || null,
      memberCount: Array.isArray(group.memberIds) ? group.memberIds.length : 0,
      accessRoleId: roleByGroup.get(String(group._id)) || null,
    }));

    return res.json(paginatedResponse({ documents: enriched, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

const setAgentSharePermission = async (req, res) => {
  try {
    const agent = await loadAgentOr404(req.params.id);
    const principalType = String(req.body?.principalType || '').trim();
    const principalId = String(req.body?.principalId || '').trim();
    const accessRoleId =
      req.body?.accessRoleId == null || req.body?.accessRoleId === ''
        ? null
        : String(req.body.accessRoleId).trim();

    if (principalType !== PrincipalType.USER && principalType !== PrincipalType.GROUP) {
      return sendError(res, 400, 'principalType debe ser user o group');
    }
    if (!toObjectId(principalId)) {
      return sendError(res, 400, 'principalId inválido');
    }

    if (principalType === PrincipalType.USER) {
      const user = await User.findById(principalId);
      if (!user) return sendError(res, 404, 'Usuario no encontrado');
    } else {
      const group = await Group.findById(principalId);
      if (!group) return sendError(res, 404, 'Grupo no encontrado');
    }

    const adminId = resolveAdminObjectId(req);

    if (!accessRoleId) {
      await revokeAgentAccess({
        principalType,
        principalId,
        agentMongoId: agent._id,
      });
      return res.json({
        message: 'Permiso revocado',
        principalType,
        principalId,
        accessRoleId: null,
      });
    }

    const role = await grantAgentAccess({
      principalType,
      principalId,
      agentMongoId: agent._id,
      accessRoleId,
      grantedBy: adminId,
    });

    return res.json({
      message: 'Permiso actualizado',
      principalType,
      principalId,
      accessRoleId: role,
    });
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
  getAgentShareMeta,
  getAgentShareUsers,
  getAgentShareGroups,
  setAgentSharePermission,
  AccessRoleIds,
};
