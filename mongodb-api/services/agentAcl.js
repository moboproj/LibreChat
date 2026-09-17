const { ObjectId } = require('mongodb');
const { getReadDB, getWriteDB } = require('../config/db');

const ACL_COLLECTION = 'aclentries';
const ROLES_COLLECTION = 'accessroles';

const PrincipalType = {
  USER: 'user',
  GROUP: 'group',
};

const PrincipalModel = {
  USER: 'User',
  GROUP: 'Group',
};

const ResourceType = {
  AGENT: 'agent',
  REMOTE_AGENT: 'remoteAgent',
};

const AccessRoleIds = {
  AGENT_VIEWER: 'agent_viewer',
  AGENT_EDITOR: 'agent_editor',
  AGENT_OWNER: 'agent_owner',
  REMOTE_AGENT_VIEWER: 'remoteAgent_viewer',
  REMOTE_AGENT_EDITOR: 'remoteAgent_editor',
  REMOTE_AGENT_OWNER: 'remoteAgent_owner',
};

const AGENT_ROLE_BITS = {
  [AccessRoleIds.AGENT_VIEWER]: 1,
  [AccessRoleIds.AGENT_EDITOR]: 1 | 2,
  [AccessRoleIds.AGENT_OWNER]: 1 | 2 | 4 | 8,
};

const REMOTE_ROLE_FOR_AGENT = {
  [AccessRoleIds.AGENT_VIEWER]: AccessRoleIds.REMOTE_AGENT_VIEWER,
  [AccessRoleIds.AGENT_EDITOR]: AccessRoleIds.REMOTE_AGENT_EDITOR,
  [AccessRoleIds.AGENT_OWNER]: AccessRoleIds.REMOTE_AGENT_OWNER,
};

const AGENT_ROLE_OPTIONS = [
  { id: AccessRoleIds.AGENT_VIEWER, label: 'Viewer' },
  { id: AccessRoleIds.AGENT_EDITOR, label: 'Editor' },
  { id: AccessRoleIds.AGENT_OWNER, label: 'Owner' },
];

function aclRead() {
  return getReadDB().collection(ACL_COLLECTION);
}

function aclWrite() {
  return getWriteDB().collection(ACL_COLLECTION);
}

function rolesRead() {
  return getReadDB().collection(ROLES_COLLECTION);
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  const raw = String(value);
  if (!ObjectId.isValid(raw) || String(new ObjectId(raw)) !== raw) return null;
  return new ObjectId(raw);
}

function normalizeAgentRoleId(accessRoleId) {
  const id = String(accessRoleId || '').trim();
  if (!AGENT_ROLE_BITS[id]) {
    const error = new Error(
      'Rol de acceso inválido (usa agent_viewer, agent_editor o agent_owner)',
    );
    error.status = 400;
    throw error;
  }
  return id;
}

async function findAccessRole(accessRoleId, resourceType) {
  return rolesRead().findOne({ accessRoleId, resourceType });
}

async function resolveRole(accessRoleId, resourceType) {
  const role = await findAccessRole(accessRoleId, resourceType);
  if (role) {
    return {
      _id: role._id,
      accessRoleId: role.accessRoleId,
      permBits: role.permBits,
    };
  }

  const fallbackBits =
    resourceType === ResourceType.REMOTE_AGENT
      ? AGENT_ROLE_BITS[
          Object.entries(REMOTE_ROLE_FOR_AGENT).find(
            ([, remoteId]) => remoteId === accessRoleId,
          )?.[0]
        ]
      : AGENT_ROLE_BITS[accessRoleId];

  if (fallbackBits == null) {
    const error = new Error(`No se encontró el rol ${accessRoleId} en accessroles`);
    error.status = 500;
    throw error;
  }

  return {
    _id: null,
    accessRoleId,
    permBits: fallbackBits,
  };
}

async function upsertAclEntry({
  principalType,
  principalId,
  resourceType,
  resourceId,
  accessRoleId,
  grantedBy,
}) {
  const principalOid = toObjectId(principalId);
  const resourceOid = toObjectId(resourceId);
  const granterOid = toObjectId(grantedBy);
  if (!principalOid || !resourceOid) {
    const error = new Error('principalId o resourceId inválidos');
    error.status = 400;
    throw error;
  }

  const role = await resolveRole(accessRoleId, resourceType);
  const principalModel =
    principalType === PrincipalType.GROUP ? PrincipalModel.GROUP : PrincipalModel.USER;

  const filter = {
    principalType,
    principalId: principalOid,
    principalModel,
    resourceType,
    resourceId: resourceOid,
  };

  const $set = {
    principalType,
    principalId: principalOid,
    principalModel,
    resourceType,
    resourceId: resourceOid,
    permBits: role.permBits,
    grantedAt: new Date(),
  };
  if (role._id) $set.roleId = role._id;
  if (granterOid) $set.grantedBy = granterOid;

  await aclWrite().updateOne(filter, { $set }, { upsert: true });
}

async function revokeAclEntry({ principalType, principalId, resourceType, resourceId }) {
  const principalOid = toObjectId(principalId);
  const resourceOid = toObjectId(resourceId);
  if (!principalOid || !resourceOid) return { deletedCount: 0 };

  return aclWrite().deleteMany({
    principalType,
    principalId: principalOid,
    resourceType,
    resourceId: resourceOid,
  });
}

async function grantAgentAccess({
  principalType,
  principalId,
  agentMongoId,
  accessRoleId,
  grantedBy,
}) {
  const agentRoleId = normalizeAgentRoleId(accessRoleId);
  const remoteRoleId = REMOTE_ROLE_FOR_AGENT[agentRoleId];

  await Promise.all([
    upsertAclEntry({
      principalType,
      principalId,
      resourceType: ResourceType.AGENT,
      resourceId: agentMongoId,
      accessRoleId: agentRoleId,
      grantedBy,
    }),
    upsertAclEntry({
      principalType,
      principalId,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agentMongoId,
      accessRoleId: remoteRoleId,
      grantedBy,
    }),
  ]);

  return agentRoleId;
}

async function revokeAgentAccess({ principalType, principalId, agentMongoId }) {
  await Promise.all([
    revokeAclEntry({
      principalType,
      principalId,
      resourceType: ResourceType.AGENT,
      resourceId: agentMongoId,
    }),
    revokeAclEntry({
      principalType,
      principalId,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agentMongoId,
    }),
  ]);
}

async function grantOwnerPair({ userId, agentMongoId, grantedBy }) {
  return grantAgentAccess({
    principalType: PrincipalType.USER,
    principalId: userId,
    agentMongoId,
    accessRoleId: AccessRoleIds.AGENT_OWNER,
    grantedBy: grantedBy || userId,
  });
}

async function listAgentAclEntries(agentMongoId) {
  const resourceOid = toObjectId(agentMongoId);
  if (!resourceOid) return [];
  return aclRead()
    .find({
      resourceType: ResourceType.AGENT,
      resourceId: resourceOid,
      principalType: { $in: [PrincipalType.USER, PrincipalType.GROUP] },
    })
    .toArray();
}

async function deleteAllAgentAcl(agentMongoId) {
  const resourceOid = toObjectId(agentMongoId);
  if (!resourceOid) return { deletedCount: 0 };
  return aclWrite().deleteMany({
    resourceId: resourceOid,
    resourceType: { $in: [ResourceType.AGENT, ResourceType.REMOTE_AGENT] },
  });
}

function roleIdFromPermBits(permBits) {
  const bits = Number(permBits) || 0;
  if ((bits & 4) > 0 || (bits & 8) > 0) return AccessRoleIds.AGENT_OWNER;
  if ((bits & 2) > 0) return AccessRoleIds.AGENT_EDITOR;
  if ((bits & 1) > 0) return AccessRoleIds.AGENT_VIEWER;
  return null;
}

module.exports = {
  PrincipalType,
  ResourceType,
  AccessRoleIds,
  AGENT_ROLE_OPTIONS,
  grantAgentAccess,
  revokeAgentAccess,
  grantOwnerPair,
  listAgentAclEntries,
  deleteAllAgentAcl,
  roleIdFromPermBits,
  toObjectId,
};
