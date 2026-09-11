const { ObjectId } = require('mongodb');
const Role = require('../models/role.model');

const getRoles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const documents = await Role.list({ limit });
    return res.json({ documents });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'El nombre del rol es obligatorio' });
    }
    if (name.toUpperCase() === 'STORE' && name !== 'STORE') {
      return res.status(400).json({ error: 'El rol de tienda debe llamarse exactamente STORE' });
    }

    const existing = await Role.findByName(name);
    if (existing) {
      return res.status(409).json({ error: `El rol ${name} ya existe` });
    }

    let permissions = req.body.permissions;
    if (name === 'STORE') {
      const userRole = await Role.findByName('USER');
      if (!userRole || !userRole.permissions) {
        return res.status(400).json({ error: 'No hay rol USER en la base para clonar permisos' });
      }
      permissions = userRole.permissions;
    }

    const result = await Role.create({
      name,
      permissions: permissions || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ _id: result.insertedId, name });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const current = await Role.findById(id);
    if (!current) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result = await Role.updateById(id, {
      $set: {
        permissions: req.body.permissions ?? current.permissions,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ message: 'Document updated' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const current = await Role.findById(id);
    if (!current) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (current.name === 'ADMIN' || current.name === 'USER' || current.name === 'STORE') {
      return res.status(403).json({ error: `No se puede eliminar el rol ${current.name}` });
    }

    const result = await Role.deleteById(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
