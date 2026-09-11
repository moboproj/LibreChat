const bcrypt = require('bcryptjs');
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

function buildPayload(user) {
  return {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };
}

const login = async (req, res) => {
  if (!config.localLoginEnabled) {
    return res.status(403).json({
      valid: false,
      message: 'El login local está deshabilitado. Usa SSO.',
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ valid: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ valid: false, message: 'Usuario no encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ valid: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    }

    if (!user.password) {
      return res.status(401).json({
        valid: false,
        message:
          'Este usuario no tiene contraseña local (solo SSO). Define una contraseña o usa otro ADMIN.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ valid: false, message: 'Contraseña incorrecta' });
    }

    const payload = buildPayload(user);
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });

    await RefreshToken.add(refreshToken, { userId: String(user._id), email: user.email });

    return res.json({
      valid: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res
      .status(500)
      .json({ valid: false, message: 'Error interno del servidor', error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh Token Requerido' });
    }

    if (!(await RefreshToken.has(refreshToken))) {
      return res.status(403).json({ message: 'Refresh Token Inválido o Expirado' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      await RefreshToken.remove(refreshToken);
      return res.status(403).json({ message: 'Refresh Token expirado' });
    }

    const payload = buildPayload(decoded);
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Error en refresh:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.remove(refreshToken);
    return res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

const getConfig = (req, res) => {
  res.json({
    passwordRequired: false,
    localLoginEnabled: Boolean(config.localLoginEnabled),
    authEnabled: true,
    usersWriteEnabled: Boolean(config.usersWriteEnabled),
    ssoLinkConfigured: Boolean(config.ssoLinkConfigured),
    openidEnabled: Boolean(config.openidEnabled),
    openidButtonLabel: 'Iniciar sesión con SSO',
  });
};

module.exports = {
  login,
  refresh,
  logout,
  getConfig,
};
