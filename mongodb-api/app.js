const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/openapi.yaml', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'openapi.yaml'));
  });

  app.use('/api', apiRoutes);

  app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
      error: err.message || 'Internal Server Error',
      message: err.message || 'Internal Server Error',
    });
  });

  return app;
}

module.exports = { createApp };
