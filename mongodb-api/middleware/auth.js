const jwt = require('jsonwebtoken');
const { JWT_SECRET, getDB } = require('../config/db');

// Service token bypass for M2M communication
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

/**
 * Middleware to verify a valid JWT token OR Service Token
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Acceso denegado: cabecera Authorization no encontrada' });
    }

    const token = authHeader.split(' ')[1]; // Format: Bearer <token>
    if (!token) {
      return res.status(401).json({ message: 'Acceso denegado: formato de token inválido' });
    }

    // Check for Service Token bypass first
    if (SERVICE_TOKEN && token === SERVICE_TOKEN) {
      req.user = { id: 'service-account', role: 'ADMIN', isService: true };
      return next();
    }

    // Otherwise, verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, email, role
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Token inválido', error: error.message });
  }
};

/**
 * Middleware to verify strictly ADMIN role
 * Must be used AFTER requireAuth
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acceso prohibido: se requieren permisos de administrador' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
