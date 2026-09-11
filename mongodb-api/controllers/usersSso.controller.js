const config = require('../config/env');
const {
  SsoDelegatedError,
  fetchDelegatedRoles,
  fetchDelegatedEmployee,
  linkDelegatedUsers,
} = require('../services/ssoDelegated');
const { syncLocalUserFromSsoEmployee } = require('../services/ssoUserSync');
const { sendError, fromException } = require('../utils/httpError');

function tokenFromRequest(req) {
  const header = req.headers['x-sso-access-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return undefined;
}

const getSsoLinkStatus = (req, res) => {
  return res.json({
    configured: Boolean(config.ssoLinkConfigured),
    clientId: config.ssoDelegatedClientId || null,
    baseUrl: config.ssoDelegatedBaseUrl || null,
  });
};

const getSsoRoles = async (req, res) => {
  try {
    const data = await fetchDelegatedRoles(tokenFromRequest(req));
    return res.json({
      roles: data.roles || [],
      client_id: data.client_id || config.ssoDelegatedClientId,
    });
  } catch (error) {
    if (error instanceof SsoDelegatedError) {
      return sendError(res, error.status, error.message, { details: error.details });
    }
    return fromException(res, error);
  }
};

const getSsoEmployee = async (req, res) => {
  try {
    const employeeNumber = String(req.params.employeeNumber || '').trim();
    const data = await fetchDelegatedEmployee(employeeNumber, tokenFromRequest(req));
    return res.json(data);
  } catch (error) {
    if (error instanceof SsoDelegatedError) {
      return sendError(res, error.status, error.message, { details: error.details });
    }
    return fromException(res, error);
  }
};

const linkSsoUser = async (req, res) => {
  try {
    const employeeNumber = String(req.body.user || req.body.employeeNumber || '').trim();
    const roleCodigos = Array.isArray(req.body.role_codigos)
      ? req.body.role_codigos.map((role) => String(role).trim()).filter(Boolean)
      : [];

    if (!employeeNumber) {
      return sendError(res, 400, 'El número de empleado es requerido');
    }
    if (!roleCodigos.length) {
      return sendError(res, 400, 'Debe indicar al menos un rol SSO (role_codigos)');
    }

    const preview = await fetchDelegatedEmployee(employeeNumber, tokenFromRequest(req));
    if (!preview.found || !preview.empleado) {
      return sendError(res, 404, 'Empleado no encontrado en SSO');
    }
    if (preview.empleado.enabled === false) {
      return sendError(res, 400, 'El empleado está bloqueado en SSO');
    }

    const linkResult = await linkDelegatedUsers(
      [{ user: employeeNumber, role_codigos: roleCodigos }],
      tokenFromRequest(req),
    );

    if (linkResult.ok === false) {
      return sendError(
        res,
        502,
        'El usuario fue procesado pero hubo errores de sincronización con Keycloak',
        {
          result: linkResult,
        },
      );
    }

    let localUser = null;
    try {
      localUser = await syncLocalUserFromSsoEmployee({
        employeeNumber,
        email: preview.empleado.email,
        name: preview.empleado.nombre,
        roleCodigos,
      });
    } catch (syncError) {
      return res.status(200).json({
        ok: true,
        warning:
          syncError.message ||
          'Vinculado en SSO, pero no se pudo sincronizar el usuario local (JIT en primer login puede cubrirlo)',
        result: linkResult,
        employee: preview.empleado,
      });
    }

    return res.status(201).json({
      ok: true,
      result: linkResult,
      employee: preview.empleado,
      localUser,
    });
  } catch (error) {
    if (error instanceof SsoDelegatedError) {
      return sendError(res, error.status, error.message, { details: error.details });
    }
    return fromException(res, error);
  }
};

module.exports = {
  getSsoLinkStatus,
  getSsoRoles,
  getSsoEmployee,
  linkSsoUser,
};
