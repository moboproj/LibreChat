const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8082;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/LibreChat';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let db;

// Middleware
app.use(cors());
app.use(express.json());

// Verify admin password
app.post('/api/verify-password', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.json({ required: false, valid: true });
  }
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ required: true, valid: true });
  }
  res.status(401).json({ required: true, valid: false });
});

app.get('/api/config', (req, res) => {
  res.json({ passwordRequired: !!ADMIN_PASSWORD });
});

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
}

// GET all collections
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json({ collections: collections.map((c) => c.name) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET documents from a collection
app.get('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { limit = 50, skip = 0, query = '{}' } = req.query;

    const parsedQuery = JSON.parse(query);
    const documents = await db
      .collection(collection)
      .find(parsedQuery)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();

    const total = await db.collection(collection).countDocuments(parsedQuery);

    res.json({ documents, total, limit: parseInt(limit), skip: parseInt(skip) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single document by ID
app.get('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const doc = await db.collection(collection).findOne({ _id: new ObjectId(id) });
    res.json(doc || { error: 'Document not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== USER ENDPOINTS WITH PASSWORD HASHING (MUST BE BEFORE GENERIC ROUTES) ==========

// POST /api/users - Create user with hashed password
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, name, role = 'USER', username } = req.body;
    console.log('Creating user:', {
      email,
      name,
      username,
      role,
      passwordLength: password?.length,
    });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed:', hashedPassword.substring(0, 30) + '...');

    // Create user
    const user = {
      email,
      name: name || email.split('@')[0],
      username: username || email.split('@')[0],
      role: role || 'USER',
      password: hashedPassword,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(user);
    console.log('User created:', result.insertedId);
    res.json({ _id: result.insertedId, ...user, password: '[REDACTED]' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id/password - Reset user password
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== SPECIALIZED MCP ENDPOINTS ==========

// POST /api/mcpservers - Create MCP server with correct structure
app.post('/api/mcpservers', async (req, res) => {
  try {
    const { serverName, config } = req.body;

    // Get first admin to assign as author (common for local setup)
    const admin = await db.collection('users').findOne({ role: 'ADMIN' });

    const mcpServer = {
      serverName,
      config: {
        ...config,
        title: config.title || serverName,
        // Calculate tool list if possible or let user edit it later
        tools:
          config.tools ||
          Object.keys(config.toolFunctions || {})
            .map((k) => k.split('_mcp_')[0])
            .join(', '),
      },
      author: admin ? admin._id : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('mcpservers').insertOne(mcpServer);
    res.json({ _id: result.insertedId, ...mcpServer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mcpservers/:id - Update MCP server with correct structure
app.put('/api/mcpservers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { serverName, config } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (serverName) {
      updateData.serverName = serverName;
    }

    if (config) {
      updateData.config = {
        ...config,
        title: config.title || serverName || 'Untitled',
        // Recalculate tools count/list
        tools:
          config.tools ||
          Object.keys(config.toolFunctions || {})
            .map((k) => k.split('_mcp_')[0])
            .join(', '),
      };
    }

    const result = await db
      .collection('mcpservers')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    res.json({ matched: result.matchedCount, modified: result.modifiedCount, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GENERIC CRUD ROUTES ==========

// POST - Create document
app.post('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const result = await db.collection(collection).insertOne(req.body);
    res.json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update document
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const result = await db
      .collection(collection)
      .updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    res.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Remove document
app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const result = await db.collection(collection).deleteOne({ _id: new ObjectId(id) });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MongoDB REST API running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   GET    /api/collections           - List all collections`);
    console.log(`   GET    /api/:collection           - Get documents (limit, skip, query params)`);
    console.log(`   GET    /api/:collection/:id       - Get single document`);
    console.log(`   POST   /api/:collection           - Create document`);
    console.log(`   PUT    /api/:collection/:id       - Update document`);
    console.log(`   DELETE /api/:collection/:id       - Delete document`);
    console.log(`   POST   /api/users                 - Create user with hashed password`);
    console.log(`   PUT    /api/users/:id/password    - Reset user password`);
  });
});
