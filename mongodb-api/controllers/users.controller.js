const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Transaction = require('../models/transaction.model');
const { enrichUsers, countsForUser } = require('../services/userEnrichment');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { resolveSince, normalizeRange } = require('../utils/range');
const { sendError, fromException } = require('../utils/httpError');

async function resolveRoleName(role, fallback = 'USER') {
  const name = typeof role === 'string' ? role.trim() : '';
  const resolved = name || fallback;
  if (resolved.toUpperCase() === 'STORE' && resolved !== 'STORE') {
    const error = new Error('El rol de tienda debe llamarse exactamente STORE');
    error.status = 400;
    throw error;
  }
  const found = await Role.findByName(resolved);
  if (!found) {
    const error = new Error(`El rol ${resolved} no existe`);
    error.status = 400;
    throw error;
  }
  return found.name;
}

function publicUser(doc) {
  if (!doc) return null;
  const { password: _password, ...rest } = doc;
  return rest;
}

const getUsers = async (req, res) => {
  try {
    const { page, limit, skip, search } = parsePagination(req.query);
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const { documents, total } = await User.list({ limit, skip, search, role });
    const enriched = await enrichUsers(documents);
    return res.json(paginatedResponse({ documents: enriched, total, page, limit }));
  } catch (error) {
    return fromException(res, error);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid User ID format');
    }
    const user = await User.findById(id);
    if (!user) return sendError(res, 404, 'User not found');
    const [enriched] = await enrichUsers([publicUser(user)]);
    return res.json({ document: enriched });
  } catch (error) {
    return fromException(res, error);
  }
};

const getUserUsage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid User ID format');
    }
    const user = await User.findById(id);
    if (!user) return sendError(res, 404, 'User not found');

    const range = normalizeRange(req.query.range);
    const since = resolveSince(range);
    const [counts, usage] = await Promise.all([
      countsForUser(id),
      Transaction.usageForUser(id, { since }),
    ]);

    return res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
      },
      range,
      since,
      counts,
      usage,
    });
  } catch (error) {
    return fromException(res, error);
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return sendError(res, 409, 'Ya existe un usuario con ese email');
    }

    const resolvedRole = await resolveRoleName(role);
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      role: resolvedRole,
      provider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({ _id: result.insertedId });
  } catch (error) {
    return fromException(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role } = req.body;

    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid User ID format');
    }

    const updates = {
      $set: {
        updatedAt: new Date(),
      },
    };

    if (email) updates.$set.email = email.toLowerCase();
    if (name !== undefined) updates.$set.name = name;
    if (role) updates.$set.role = await resolveRoleName(role, null);

    const result = await User.updateById(id, updates);

    if (result.matchedCount === 0) {
      return sendError(res, 404, 'User not found');
    }

    return res.json({ message: 'User updated' });
  } catch (error) {
    return fromException(res, error);
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!ObjectId.isValid(id) || !password) {
      return sendError(res, 400, 'Invalid ID or missing password');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await User.updateById(id, {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return sendError(res, 404, 'User not found');
    }

    return res.json({ message: 'Password updated' });
  } catch (error) {
    return fromException(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid User ID format');
    }

    const result = await User.deleteById(id);

    if (result.deletedCount === 0) {
      return sendError(res, 404, 'User not found');
    }

    return res.json({ message: 'User deleted' });
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserUsage,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
};
