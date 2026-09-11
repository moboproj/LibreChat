const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { putPending, takePending, putExchange, takeExchange } = require('../services/openidStore');

describe('OpenID exchange store', () => {
  it('stores and consumes pending PKCE by state once', () => {
    putPending('state-a', 'verifier-a');
    const first = takePending('state-a');
    assert.equal(first.codeVerifier, 'verifier-a');
    assert.equal(takePending('state-a'), null);
  });

  it('stores and consumes one-time exchange codes', () => {
    const code = putExchange({ accessToken: 'a', user: { email: 'a@b.c' } });
    assert.match(code, /^[a-f0-9]{64}$/i);
    const payload = takeExchange(code);
    assert.equal(payload.accessToken, 'a');
    assert.equal(takeExchange(code), null);
  });

  it('rejects unknown exchange codes', () => {
    assert.equal(takeExchange('0'.repeat(64)), null);
  });
});
