const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRoutes);

  app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}

module.exports = { createApp };
