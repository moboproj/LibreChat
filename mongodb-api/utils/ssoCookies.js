const ID_TOKEN_COOKIE = 'admin_sso_id_token';

function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function readIdTokenCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[ID_TOKEN_COOKIE] || null;
}

function setIdTokenCookie(res, idToken) {
  if (!idToken) return;
  const maxAge = 60 * 60 * 8;
  res.append(
    'Set-Cookie',
    `${ID_TOKEN_COOKIE}=${encodeURIComponent(idToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

function clearIdTokenCookie(res) {
  res.append('Set-Cookie', `${ID_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

module.exports = {
  ID_TOKEN_COOKIE,
  readIdTokenCookie,
  setIdTokenCookie,
  clearIdTokenCookie,
};
