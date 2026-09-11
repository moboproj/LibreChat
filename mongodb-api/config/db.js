const { MongoClient } = require('mongodb');
const config = require('./env');

let writeClient = null;
let _readClient = null;
let writeDb = null;
let readDb = null;

function dbNameFromUri(uri) {
  const name = uri.split('/').pop().split('?')[0];
  return name || 'LibreChat';
}

async function connectClient(uri) {
  const client = new MongoClient(uri);
  await client.connect();
  return { client, db: client.db(dbNameFromUri(uri)) };
}

/**
 * Connects write (primary) and read (replica or same primary) clients.
 * Option A: set MONGODB_URI_READ to a replica; writes always use primary.
 */
async function connectDB() {
  if (writeDb && readDb) {
    return { writeDb, readDb };
  }

  const write = await connectClient(config.mongoPrimaryUri);
  writeClient = write.client;
  writeDb = write.db;

  if (config.mongoReadUri === config.mongoPrimaryUri) {
    _readClient = writeClient;
    readDb = writeDb;
  } else {
    const read = await connectClient(config.mongoReadUri);
    _readClient = read.client;
    readDb = read.db;
  }

  const same = config.mongoReadUri === config.mongoPrimaryUri;
  console.log(
    `Connected to MongoDB primary=${dbNameFromUri(config.mongoPrimaryUri)}` +
      (same ? ' (read=primary)' : ` read=${dbNameFromUri(config.mongoReadUri)}`),
  );

  return { writeDb, readDb };
}

function getWriteDB() {
  if (!writeDb) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return writeDb;
}

function getReadDB() {
  if (!readDb) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return readDb;
}

/** @deprecated Prefer getWriteDB / getReadDB. Defaults to write (primary). */
function getDB() {
  return getWriteDB();
}

module.exports = {
  connectDB,
  getWriteDB,
  getReadDB,
  getDB,
  JWT_SECRET: config.jwtSecret,
  JWT_REFRESH_SECRET: config.jwtRefreshSecret,
  JWT_EXPIRES_IN: config.jwtExpiresIn,
  JWT_REFRESH_EXPIRES_IN: config.jwtRefreshExpiresIn,
};
