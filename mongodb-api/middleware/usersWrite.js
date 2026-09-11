const config = require('../config/env');
const { sendError } = require('../utils/httpError');

/**
 * Blocks user create/update/delete/password while SSO owns the user lifecycle.
 * Re-enable with ADMIN_USERS_WRITE_ENABLED=true (e.g. if SSO is removed from admin).
 */
function requireUsersWrite(req, res, next) {
  if (config.usersWriteEnabled) {
    return next();
  }
  return sendError(
    res,
    403,
    'Escritura de usuarios deshabilitada: el ciclo de vida se gestiona vía SSO. Activa ADMIN_USERS_WRITE_ENABLED=true para reabrir CRUD local.',
  );
}

module.exports = {
  requireUsersWrite,
};
