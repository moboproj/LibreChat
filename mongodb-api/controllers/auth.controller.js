const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } = require('../config/db');

// In-memory store for refresh tokens for simplicity
// In a real prod environment, these should be saved in DB or Redis
const refreshTokens = new Set();

/**
 * Handles user login and token generation
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ valid: false, message: 'Email y contraseña son obligatorios' });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ valid: false, message: 'Usuario no encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ valid: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ valid: false, message: 'Contraseña incorrecta' });
    }

    // Generate tokens
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    
    // Store refresh token
    refreshTokens.add(refreshToken);

    res.json({
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
    res.status(500).json({ valid: false, message: 'Error interno del servidor', error: error.message });
  }
};

/**
 * Handled token refresh
 */
const refresh = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh Token Requerido' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ message: 'Refresh Token Inválido o Expirado' });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
    if (err) {
      refreshTokens.delete(refreshToken); // cleanup
      return res.status(403).json({ message: 'Refresh Token expirado' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ accessToken: newAccessToken });
  });
};

/**
 * Handles logout and refresh token invalidation
 */
const logout = (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  res.json({ message: 'Sesión cerrada exitosamente' });
};

/**
 * Validates token structure for the frontend configuration check
 */
const getConfig = (req, res) => {
  res.json({ passwordRequired: true, authEnabled: true });
};

module.exports = {
  login,
  refresh,
  logout,
  getConfig
};
