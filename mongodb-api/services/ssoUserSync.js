const User = require('../models/user.model');
const Role = require('../models/role.model');
const { mapSsoRoleToLibreChat } = require('./ssoDelegated');

async function resolveLocalRole(roleCodigos = []) {
  const mapped = mapSsoRoleToLibreChat(roleCodigos);
  const found = await Role.findByName(mapped);
  if (!found) {
    const error = new Error(`El rol local ${mapped} no existe en Mongo (roles)`);
    error.status = 400;
    throw error;
  }
  return found.name;
}

/**
 * Upsert LibreChat user after SSO delegated link (promos-style sync).
 * Match key: username = número de empleado.
 */
async function syncLocalUserFromSsoEmployee({ employeeNumber, email, name, roleCodigos }) {
  const username = String(employeeNumber || '').trim();
  if (!username) {
    const error = new Error('Número de empleado requerido para sincronizar usuario local');
    error.status = 400;
    throw error;
  }

  const role = await resolveLocalRole(roleCodigos);
  const now = new Date();
  const normalizedEmail = String(email || `${username}@sso.local`)
    .trim()
    .toLowerCase();
  const displayName = String(name || username).trim();

  const byUsername = await User.findByUsername(username);
  if (byUsername) {
    await User.updateById(byUsername._id, {
      $set: {
        email: normalizedEmail,
        name: displayName,
        username,
        role,
        provider: 'openid',
        emailVerified: true,
        updatedAt: now,
      },
    });
    return {
      _id: byUsername._id,
      created: false,
      email: normalizedEmail,
      username,
      role,
    };
  }

  const byEmail = await User.findByEmail(normalizedEmail);
  if (byEmail && String(byEmail.username || '') !== username) {
    const error = new Error(
      `Ya existe un usuario con email ${normalizedEmail} pero distinto username`,
    );
    error.status = 409;
    throw error;
  }

  if (byEmail) {
    await User.updateById(byEmail._id, {
      $set: {
        username,
        name: displayName,
        role,
        provider: 'openid',
        emailVerified: true,
        updatedAt: now,
      },
    });
    return {
      _id: byEmail._id,
      created: false,
      email: normalizedEmail,
      username,
      role,
    };
  }

  const result = await User.create({
    email: normalizedEmail,
    username,
    name: displayName,
    role,
    provider: 'openid',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    _id: result.insertedId,
    created: true,
    email: normalizedEmail,
    username,
    role,
  };
}

module.exports = {
  syncLocalUserFromSsoEmployee,
  resolveLocalRole,
};
