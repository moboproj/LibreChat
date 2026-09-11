const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapSsoRoleToLibreChat } = require('../services/ssoDelegated');

describe('SSO role mapping', () => {
  it('maps admin codes to ADMIN', () => {
    assert.equal(mapSsoRoleToLibreChat(['admin']), 'ADMIN');
    assert.equal(mapSsoRoleToLibreChat(['access', 'administrador']), 'ADMIN');
  });

  it('maps store codes to STORE', () => {
    assert.equal(mapSsoRoleToLibreChat(['sucursal']), 'STORE');
    assert.equal(mapSsoRoleToLibreChat(['store']), 'STORE');
  });

  it('defaults to USER', () => {
    assert.equal(mapSsoRoleToLibreChat(['usuario']), 'USER');
    assert.equal(mapSsoRoleToLibreChat([]), 'USER');
  });
});
