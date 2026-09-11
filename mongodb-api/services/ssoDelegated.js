const config = require('../config/env');

class SsoDelegatedError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = 'SsoDelegatedError';
    this.status = status;
    this.details = details;
  }
}

function systemBaseUrl() {
  const clientId = config.ssoDelegatedClientId;
  if (!clientId) {
    throw new SsoDelegatedError(
      'SSO_DELEGATED_CLIENT_ID / OPENID_CLIENT_ID no está configurado',
      503,
    );
  }
  const base = String(config.ssoDelegatedBaseUrl || '').replace(/\/$/, '');
  return `${base}/${encodeURIComponent(clientId)}`;
}

function resolveAccessToken(explicitToken) {
  const token = String(explicitToken || config.ssoDelegatedAccessToken || '').trim();
  if (!token) {
    throw new SsoDelegatedError(
      'Falta token SSO para la API delegada. Inicia sesión con SSO en el admin panel (o define SSO_DELEGATED_ACCESS_TOKEN solo para bootstrap).',
      503,
    );
  }
  return token;
}

async function delegatedFetch(pathname, { method = 'GET', body, accessToken } = {}) {
  const token = resolveAccessToken(accessToken);
  const url = `${systemBaseUrl()}${pathname}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new SsoDelegatedError(
      data.error || data.detail || data.message || `Error SSO delegado (${response.status})`,
      response.status >= 400 && response.status < 600 ? response.status : 502,
      data,
    );
  }

  return data;
}

async function fetchDelegatedRoles(accessToken) {
  return delegatedFetch('/roles', { accessToken });
}

async function fetchDelegatedEmployee(employeeNumber, accessToken) {
  const normalized = String(employeeNumber || '').trim();
  if (!normalized) {
    throw new SsoDelegatedError('El número de empleado es requerido', 400);
  }
  return delegatedFetch(`/employees/${encodeURIComponent(normalized)}`, { accessToken });
}

async function linkDelegatedUsers(usuarios, accessToken) {
  if (!Array.isArray(usuarios) || !usuarios.length) {
    throw new SsoDelegatedError('Debe indicar al menos un usuario a vincular', 400);
  }
  return delegatedFetch('/users', {
    method: 'POST',
    accessToken,
    body: { usuarios },
  });
}

function mapSsoRoleToLibreChat(roleCodigos = []) {
  const codes = roleCodigos
    .map((code) =>
      String(code || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  if (codes.some((code) => ['admin', 'administrador', 'omni-admin'].includes(code))) {
    return 'ADMIN';
  }
  if (codes.some((code) => ['store', 'sucursal', 'tienda'].includes(code))) {
    return 'STORE';
  }
  return 'USER';
}

module.exports = {
  SsoDelegatedError,
  fetchDelegatedRoles,
  fetchDelegatedEmployee,
  linkDelegatedUsers,
  mapSsoRoleToLibreChat,
  resolveAccessToken,
};
