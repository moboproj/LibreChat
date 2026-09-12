const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config/env');

const app = createApp();

function warmOpenIdClient() {
  if (!config.openidEnabled) return;
  // Fire-and-forget: cache Issuer.discover so the first SSO redirect is not cold.
  require('./services/openid')
    .getClient()
    .then(() => {
      console.log('OpenID client warmed');
    })
    .catch((err) => {
      console.warn('OpenID warm-up failed (SSO may be slow on first login):', err.message);
    });
}

connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`MongoDB REST API running on http://localhost:${config.port}`);
      console.log(
        'MVC routers: /api/auth, /api/users, /api/mcpservers, /api/roles, /api/agents, /api/conversations, /api/messages, /api/stats',
      );
      warmOpenIdClient();
    });
  })
  .catch((err) => {
    console.error('Critical Failure. Cannot connect to database on startup.', err);
    process.exit(1);
  });
