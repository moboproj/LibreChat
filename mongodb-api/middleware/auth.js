const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/db');
const config = require('../config/env');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Acceso denegado: cabecera Authorization no encontrada' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Acceso denegado: formato de token inválido' });
    }

    if (config.serviceToken && token === config.serviceToken) {
      req.user = { id: 'service-account', role: 'ADMIN', isService: true };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Token inválido', error: error.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res
      .status(403)
      .json({ message: 'Acceso prohibido: se requieren permisos de administrador' });
  }
  return next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
