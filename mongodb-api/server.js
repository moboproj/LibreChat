const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const collectionsRoutes = require('./routes/collections.routes');
const { login } = require('./controllers/auth.controller');

const app = express();
const PORT = process.env.PORT || 8082;

// Middleware
app.use(cors());
app.use(express.json());

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', collectionsRoutes); // Handled: /mcpservers, /roles, /collections, /stats

// Retrocompatibility endpoint for old components calling /api/verify-password
app.post('/api/verify-password', login);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MongoDB REST API running on http://localhost:${PORT}`);
    console.log(`🔒 API protected by JWT Role-Based Auth`);
    console.log(`📚 Active Routers: /api/auth, /api/users, /api/mcpservers, /api/roles, /api/collections`);
  });
}).catch(err => {
    console.error("Critical Failure. Cannot connect to database on startup.", err);
    process.exit(1);
});
