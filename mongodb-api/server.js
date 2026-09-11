const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config/env');

const app = createApp();

connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`MongoDB REST API running on http://localhost:${config.port}`);
      console.log(
        'MVC routers: /api/auth, /api/users, /api/mcpservers, /api/roles, /api/agents, /api/conversations, /api/messages, /api/stats',
      );
    });
  })
  .catch((err) => {
    console.error('Critical Failure. Cannot connect to database on startup.', err);
    process.exit(1);
  });
