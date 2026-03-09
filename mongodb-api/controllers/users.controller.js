const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getDB } = require('../config/db');

const getUsers = async (req, res) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 50;
    const documents = await db.collection('users')
      .find({})
      .project({ password: 0 }) // Never return passwords
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const db = getDB();
    const { email, password, name, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      role: role || 'USER',
      provider: 'local',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({ _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { email, name, role } = req.body;

    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    const updates = {
      $set: {
        updatedAt: new Date()
      }
    };

    if (email) updates.$set.email = email.toLowerCase();
    if (name !== undefined) updates.$set.name = name;
    if (role) updates.$set.role = role;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      updates
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { password } = req.body;

    if (!ObjectId.isValid(id) || !password) {
      return res.status(400).json({ error: 'Invalid ID or missing password' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser
};
