const { ObjectId } = require('mongodb');
const Role = require('../models/role.model');
const User = require('../models/user.model');
const { enrichUsers } = require('../services/userEnrichment');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError, fromException } = require('../utils/httpError');

const getRoles = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const [{ documents, total }, storeRole] = await Promise.all([
      Role.list({ limit, skip, search }),
      Role.findByName('STORE'),
    ]);

    const withCounts = await Promise.all(
      documents.map(async (role) => ({
        ...role,
        userCount: await User.countByRole(role.name),
      })),
    );

    return res.json({
      ...paginatedResponse({ documents: withCounts, total, page, limit }),
      hasStore: Boolean(storeRole),
    });
  } catch (error) {
    return fromException(res, error);
  }
};

const getRoleUsers = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid ID format');
    }
    const role = await Role.findById(id);
    if (!role) return sendError(res, 404, 'Role not found');

    const { page, limit, skip, search } = parsePagination(req.query);
    const { documents, total } = await User.listByRole(role.name, { limit, skip, search });
    const enriched = await enrichUsers(documents);
    return res.json({
      role: { _id: role._id, name: role.name },
      ...paginatedResponse({ documents: enriched, total, page, limit }),
    });
  } catch (error) {
    return fromException(res, error);
  }
};

const createRole = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return sendError(res, 400, 'El nombre del rol es obligatorio');
    }
    if (name.toUpperCase() === 'STORE' && name !== 'STORE') {
      return sendError(res, 400, 'El rol de tienda debe llamarse exactamente STORE');
    }

    const existing = await Role.findByName(name);
    if (existing) {
      return sendError(res, 409, `El rol ${name} ya existe`);
    }

    let permissions = req.body.permissions;
    if (name === 'STORE') {
      const userRole = await Role.findByName('USER');
      if (!userRole || !userRole.permissions) {
        return sendError(res, 400, 'No hay rol USER en la base para clonar permisos');
      }
      permissions = userRole.permissions;
    }

    const result = await Role.create({
      name,
      permissions: permissions || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ _id: result.insertedId, name });
  } catch (error) {
    return fromException(res, error);
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid ID format');
    }

    const current = await Role.findById(id);
    if (!current) {
      return sendError(res, 404, 'Document not found');
    }

    const result = await Role.updateById(id, {
      $set: {
        permissions: req.body.permissions ?? current.permissions,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return sendError(res, 404, 'Document not found');
    }

    return res.json({ message: 'Document updated' });
  } catch (error) {
    return fromException(res, error);
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid ID format');
    }

    const current = await Role.findById(id);
    if (!current) {
      return sendError(res, 404, 'Document not found');
    }
    if (current.name === 'ADMIN' || current.name === 'USER' || current.name === 'STORE') {
      return sendError(res, 403, `No se puede eliminar el rol ${current.name}`);
    }

    const result = await Role.deleteById(id);
    if (result.deletedCount === 0) {
      return sendError(res, 404, 'Document not found');
    }

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getRoles,
  getRoleUsers,
  createRole,
  updateRole,
  deleteRole,
};
