const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} = require('../config/db');
const config = require('../config/env');
const User = require('../models/user.model');
const RefreshToken = require('../models/refreshToken.model');
const {
  assertOpenIdConfigured,
  buildAuthorization,
  exchangeAuthorizationCode,
  claimsFromTokenSet,
  buildEndSessionUrl,
  createPkcePair,
} = require('../services/openid');
const { putPending, takePending, putExchange, takeExchange } = require('../services/openidStore');
const { readIdTokenCookie, setIdTokenCookie, clearIdTokenCookie } = require('../utils/ssoCookies');

function buildPayload(user) {
  return {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };
}

function panelRedirect(query) {
  const base = String(config.adminPanelUrl || '').replace(/\/$/, '');
  const params = new URLSearchParams(query);
  return `${base}/auth/openid/callback?${params.toString()}`;
}

function signedOutUrl() {
  return config.openidPostLogoutRedirectUri || 'http://localhost:8082/api/auth/openid';
}

function redirectError(res, code, description) {
  return res.redirect(
    panelRedirect({
      error: code,
      error_description: description || code,
    }),
  );
}

async function findAdminUser(claims) {
  if (claims.sub) {
    const byOpenId = await User.findByOpenIdId(claims.sub);
    if (byOpenId) return byOpenId;
  }
  if (claims.email) {
    const byEmail = await User.findByEmail(claims.email);
    if (byEmail) return byEmail;
  }
  if (claims.username) {
    const byUsername = await User.findByUsername(claims.username);
    if (byUsername) return byUsername;
  }
  return null;
}

const startOpenIdLogin = async (req, res) => {
  try {
    assertOpenIdConfigured();
    const { codeVerifier, codeChallenge, state } = createPkcePair();
    putPending(state, codeVerifier);
    const url = await buildAuthorization({ state, codeChallenge });
    return res.redirect(url);
  } catch (error) {
    console.error('[auth/openid] start failed:', error.message);
    return redirectError(res, 'openid_start_failed', error.message);
  }
};

const openIdCallback = async (req, res) => {
  try {
    assertOpenIdConfigured();

    if (req.query.error) {
      return redirectError(
        res,
        String(req.query.error),
        String(req.query.error_description || req.query.error),
      );
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      return redirectError(res, 'missing_code', 'Falta code o state en el callback OpenID');
    }

    const pending = takePending(state);
    if (!pending) {
      return redirectError(res, 'invalid_state', 'State OpenID inválido o expirado');
    }

    const tokenSet = await exchangeAuthorizationCode({
      code,
      state,
      codeVerifier: pending.codeVerifier,
    });
    const claims = claimsFromTokenSet(tokenSet);
    const user = await findAdminUser(claims);

    if (!user) {
      return redirectError(
        res,
        'user_not_found',
        'No hay un usuario local vinculado a esta cuenta SSO',
      );
    }
    if (user.role !== 'ADMIN') {
      return redirectError(res, 'not_admin', 'Se requiere rol ADMIN en Omnichat');
    }

    if (claims.sub && user.openidId !== claims.sub) {
      try {
        await User.updateById(String(user._id), {
          $set: {
            openidId: claims.sub,
            provider: user.provider || 'openid',
            updatedAt: new Date(),
          },
        });
      } catch (linkError) {
        console.warn('[auth/openid] no se pudo guardar openidId:', linkError.message);
      }
    }

    const payload = buildPayload(user);
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
    await RefreshToken.add(refreshToken, { userId: String(user._id), email: user.email });

    const exchangeCode = putExchange({
      accessToken,
      refreshToken,
      ssoAccessToken: tokenSet.access_token || null,
      ssoIdToken: tokenSet.id_token || null,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || claims.name || user.email,
        role: user.role,
      },
    });

    // Like promos: keep id_token in HttpOnly cookie for server-side end_session.
    if (tokenSet.id_token) {
      setIdTokenCookie(res, tokenSet.id_token);
    }

    return res.redirect(panelRedirect({ code: exchangeCode }));
  } catch (error) {
    console.error('[auth/openid] callback failed:', error.message);
    return redirectError(res, 'openid_callback_failed', error.message);
  }
};

const exchangeOpenIdCode = async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code || !/^[a-f0-9]{64}$/i.test(code)) {
      return res.status(400).json({
        valid: false,
        message: 'Código de intercambio inválido',
      });
    }

    const payload = takeExchange(code);
    if (!payload) {
      return res.status(401).json({
        valid: false,
        message: 'Código de intercambio inválido o expirado',
      });
    }

    return res.json({
      valid: true,
      ...payload,
    });
  } catch (error) {
    console.error('[auth/openid] exchange failed:', error.message);
    return res.status(500).json({
      valid: false,
      message: 'Error interno al intercambiar código OpenID',
      error: error.message,
    });
  }
};

const openIdLogoutRedirect = async (req, res) => {
  const wantsJson =
    req.is('application/json') ||
    (typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json'));

  try {
    const idTokenHint =
      (typeof req.body?.id_token_hint === 'string' && req.body.id_token_hint.trim()) ||
      (typeof req.query.id_token_hint === 'string' && req.query.id_token_hint.trim()) ||
      readIdTokenCookie(req) ||
      undefined;

    clearIdTokenCookie(res);

    if (!config.openidEnabled) {
      if (wantsJson) return res.json({ redirect: signedOutUrl() });
      return res.redirect(signedOutUrl());
    }

    const url = await buildEndSessionUrl({
      idTokenHint,
      postLogoutRedirectUri: config.openidPostLogoutRedirectUri,
      logoutHint: typeof req.body?.logout_hint === 'string' ? req.body.logout_hint : undefined,
    });

    // LibreChat: API returns the IdP end_session URL; the browser navigates there.
    if (wantsJson) {
      return res.json({ redirect: url });
    }
    return res.redirect(url);
  } catch (error) {
    console.error('[auth/openid] logout redirect failed:', error.message);
    clearIdTokenCookie(res);
    if (wantsJson) return res.json({ redirect: signedOutUrl() });
    return res.redirect(signedOutUrl());
  }
};

/** Optional bridge if Keycloak post_logout points here instead of the SPA. */
const openIdLogoutComplete = (req, res) => {
  clearIdTokenCookie(res);
  return res.redirect(signedOutUrl());
};

module.exports = {
  startOpenIdLogin,
  openIdCallback,
  exchangeOpenIdCode,
  openIdLogoutRedirect,
  openIdLogoutComplete,
};
