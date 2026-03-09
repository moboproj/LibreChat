const { MongoClient } = require('mongodb');

// Get configuration from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/LibreChat';
// JWT Secret - should be set in environment, fallback for development only
const JWT_SECRET = process.env.JWT_SECRET || 'librechat_admin_secret_key_change_me_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'librechat_admin_refresh_secret_change_me';

// JWT expiration times
const JWT_EXPIRES_IN = '15m'; // Access token is short-lived for security
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token lives longer

// Database connection state
let db = null;
let client = null;

/**
 * Connects to MongoDB and returns the database instance
 */
async function connectDB() {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    // Parse the DB name from the URI. Usually 'LibreChat'
    const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'LibreChat';
    db = client.db(dbName);
    console.log(`Connected successfully to MongoDB database: ${dbName}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Gets the current database instance. Ensure connectDB is called first.
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
};
