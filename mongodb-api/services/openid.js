const { Issuer, generators } = require('openid-client');
const config = require('../config/env');

let cachedClient = null;
let cachedIssuer = null;

function assertOpenIdConfigured() {
  if (!config.openidEnabled) {
    const error = new Error(
      'OpenID no está configurado. Define OPENID_ISSUER y OPENID_CLIENT_ID en .env.admin',
    );
    error.status = 503;
    throw error;
  }
}

async function getClient() {
  assertOpenIdConfigured();
  if (cachedClient) return cachedClient;

  cachedIssuer = await Issuer.discover(config.openidIssuer);
  const metadata = {
    client_id: config.openidClientId,
    redirect_uris: [config.openidCallbackUrl],
    response_types: ['code'],
  };

  if (config.openidClientSecret) {
    metadata.client_secret = config.openidClientSecret;
    metadata.token_endpoint_auth_method = 'client_secret_post';
  } else {
    metadata.token_endpoint_auth_method = 'none';
  }

  cachedClient = new cachedIssuer.Client(metadata);
  return cachedClient;
}

function buildAuthorization({ state, codeChallenge }) {
  return getClient().then((client) =>
    client.authorizationUrl({
      scope: config.openidScope,
      state,
      ...(config.openidUsePkce
        ? {
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          }
        : {}),
    }),
  );
}

async function exchangeAuthorizationCode({ code, state, codeVerifier }) {
  const client = await getClient();
  const checks = { state };
  if (config.openidUsePkce) {
    checks.code_verifier = codeVerifier;
  }
  // Keycloak may advertise authorization_response_iss_parameter_supported
  // but omit `iss` on the redirect; openid-client then rejects the callback.
  const params = {
    code,
    state,
    iss: client.issuer.issuer,
  };
  return client.callback(config.openidCallbackUrl, params, checks);
}

function claimsFromTokenSet(tokenSet) {
  const claims = typeof tokenSet.claims === 'function' ? tokenSet.claims() : {};
  const email =
    claims.email ||
    claims.preferred_username ||
    (typeof claims.upn === 'string' ? claims.upn : null);
  const username = claims.preferred_username || claims.username || claims.sub || null;
  const name = claims.name || claims.given_name || username || email || '';
  return {
    sub: claims.sub || null,
    email: email ? String(email).toLowerCase() : null,
    username: username ? String(username) : null,
    name: String(name || ''),
    raw: claims,
  };
}

async function buildEndSessionUrl({ idTokenHint, postLogoutRedirectUri, logoutHint } = {}) {
  const client = await getClient();
  const redirectUri =
    postLogoutRedirectUri ||
    config.openidPostLogoutRedirectUri ||
    'http://localhost:8082/api/auth/openid';

  const endSessionEndpoint =
    client.issuer?.metadata?.end_session_endpoint ||
    `${String(client.issuer?.issuer || config.openidIssuer).replace(/\/$/, '')}/protocol/openid-connect/logout`;

  const url = new URL(endSessionEndpoint);
  url.searchParams.set('post_logout_redirect_uri', redirectUri);
  url.searchParams.set('client_id', config.openidClientId);

  // Same cascading strategy as LibreChat LogoutController / promos:
  // prefer id_token_hint; if too long, logout_hint + client_id.
  const maxLen = 2000;
  if (idTokenHint) {
    const projected = url.toString().length + '&id_token_hint='.length + idTokenHint.length;
    if (projected <= maxLen) {
      url.searchParams.set('id_token_hint', idTokenHint);
    } else if (logoutHint) {
      url.searchParams.set('logout_hint', logoutHint);
    }
  } else if (logoutHint) {
    url.searchParams.set('logout_hint', logoutHint);
  }

  return url.toString();
}

function createPkcePair() {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  return { codeVerifier, codeChallenge, state };
}

module.exports = {
  assertOpenIdConfigured,
  getClient,
  buildAuthorization,
  exchangeAuthorizationCode,
  claimsFromTokenSet,
  buildEndSessionUrl,
  createPkcePair,
};
