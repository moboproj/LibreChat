const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const {
  api,
  loginAdmin,
  startTestServer,
  stopTestServer,
  cleanupTestDocs,
  unique,
  ObjectId,
  TEST_TAG,
  ADMIN_EMAIL,
} = require('./helpers');
const { getWriteDB } = require('../config/db');

describe('Agents share + ACL + advanced fields', () => {
  let agentKey = '';
  let mongoId = '';
  let adminUserId = '';
  let otherUserId = '';
  let groupId = '';

  before(async () => {
    await startTestServer();
    await cleanupTestDocs();
    await loginAdmin();

    const db = getWriteDB();
    const admin = await db.collection('users').findOne({ email: ADMIN_EMAIL });
    assert.ok(admin, 'admin test user must exist');
    adminUserId = String(admin._id);

    const password = await bcrypt.hash('OtherUser123!', 10);
    const now = new Date();
    const otherEmail = `owner.${unique()}@crud.test.local`;
    const otherInsert = await db.collection('users').insertOne({
      email: otherEmail,
      name: 'Other Owner',
      username: `owner_${unique()}`,
      password,
      role: 'USER',
      provider: 'local',
      emailVerified: true,
      seedSource: TEST_TAG,
      createdAt: now,
      updatedAt: now,
    });
    otherUserId = String(otherInsert.insertedId);

    const groupInsert = await db.collection('groups').insertOne({
      name: `CRUD Group ${unique()}`,
      email: `group.${unique()}@crud.test.local`,
      description: 'share test group',
      memberIds: [otherInsert.insertedId],
      seedSource: TEST_TAG,
      createdAt: now,
      updatedAt: now,
    });
    groupId = String(groupInsert.insertedId);
  });

  after(async () => {
    const db = getWriteDB();
    if (mongoId) {
      await api(`/api/agents/${agentKey || mongoId}`, { method: 'DELETE' }).catch(() => {});
      await db.collection('aclentries').deleteMany({
        resourceId: new ObjectId(mongoId),
      });
    }
    if (groupId) {
      await db.collection('groups').deleteOne({ _id: new ObjectId(groupId) });
    }
    await cleanupTestDocs();
    await stopTestServer();
  });

  it('GET share roles returns viewer/editor/owner', async () => {
    const res = await api('/api/agents/share/roles');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const ids = (res.data.roles || []).map((r) => r.id);
    assert.ok(ids.includes('agent_viewer'));
    assert.ok(ids.includes('agent_editor'));
    assert.ok(ids.includes('agent_owner'));
  });

  it('CREATE agent defaults owner to admin and grants ACL owner pair', async () => {
    const name = `Share Agent ${unique()}`;
    const res = await api('/api/agents', {
      method: 'POST',
      body: {
        name,
        provider: 'openAI',
        model: 'gpt-4o-mini',
        description: 'share test',
        instructions: 'Be helpful',
        tools: ['web_search'],
        avatar: 'https://example.com/avatar.png',
        model_parameters: { temperature: 0.4, top_p: 0.9, max_output_tokens: 1024 },
        conversation_starters: ['Hola', 'Ayúdame'],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    agentKey = res.data.id;
    mongoId = String(res.data._id);

    const detail = await api(`/api/agents/${agentKey}`);
    assert.equal(detail.status, 200);
    assert.equal(String(detail.data.document.author), adminUserId);
    assert.equal(detail.data.document.avatar?.filepath, 'https://example.com/avatar.png');
    assert.equal(detail.data.document.model_parameters?.temperature, 0.4);
    assert.deepEqual(detail.data.document.conversation_starters, ['Hola', 'Ayúdame']);

    const db = getWriteDB();
    const acl = await db
      .collection('aclentries')
      .find({ resourceId: new ObjectId(mongoId), principalId: new ObjectId(adminUserId) })
      .toArray();
    const types = new Set(acl.map((e) => e.resourceType));
    assert.ok(types.has('agent'), `expected agent ACL, got ${JSON.stringify(acl)}`);
    assert.ok(types.has('remoteAgent'), `expected remoteAgent ACL, got ${JSON.stringify(acl)}`);
    assert.ok(acl.every((e) => (Number(e.permBits) & 4) > 0 || (Number(e.permBits) & 8) > 0));
  });

  it('CREATE with optional ownerId assigns that user as author+owner', async () => {
    const name = `Owned Agent ${unique()}`;
    const res = await api('/api/agents', {
      method: 'POST',
      body: {
        name,
        provider: 'openAI',
        model: 'gpt-4o-mini',
        ownerId: otherUserId,
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    const ownedKey = res.data.id;
    const ownedMongoId = String(res.data._id);

    const detail = await api(`/api/agents/${ownedKey}`);
    assert.equal(String(detail.data.document.author), otherUserId);

    const db = getWriteDB();
    const acl = await db
      .collection('aclentries')
      .find({
        resourceId: new ObjectId(ownedMongoId),
        principalId: new ObjectId(otherUserId),
        resourceType: 'agent',
      })
      .toArray();
    assert.equal(acl.length, 1);
    assert.ok((Number(acl[0].permBits) & 4) > 0 || (Number(acl[0].permBits) & 8) > 0);

    await api(`/api/agents/${ownedKey}`, { method: 'DELETE' });
    const leftover = await db.collection('aclentries').countDocuments({
      resourceId: new ObjectId(ownedMongoId),
    });
    assert.equal(leftover, 0);
  });

  it('LIST share users includes accessRoleId for owner', async () => {
    const res = await api(
      `/api/agents/${agentKey}/share/users?search=${encodeURIComponent(ADMIN_EMAIL)}&limit=20`,
    );
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(Array.isArray(res.data.documents));
    const row = res.data.documents.find((u) => String(u._id) === adminUserId);
    assert.ok(row, 'admin should appear in share users');
    assert.equal(row.accessRoleId, 'agent_owner');
  });

  it('SET share permission for user and group, then revoke', async () => {
    const grantUser = await api(`/api/agents/${agentKey}/share`, {
      method: 'PUT',
      body: {
        principalType: 'user',
        principalId: otherUserId,
        accessRoleId: 'agent_editor',
      },
    });
    assert.equal(grantUser.status, 200, JSON.stringify(grantUser.data));
    assert.equal(grantUser.data.accessRoleId, 'agent_editor');

    const users = await api(`/api/agents/${agentKey}/share/users?search=Other%20Owner&limit=20`);
    const userRow = users.data.documents.find((u) => String(u._id) === otherUserId);
    assert.equal(userRow?.accessRoleId, 'agent_editor');

    const grantGroup = await api(`/api/agents/${agentKey}/share`, {
      method: 'PUT',
      body: {
        principalType: 'group',
        principalId: groupId,
        accessRoleId: 'agent_viewer',
      },
    });
    assert.equal(grantGroup.status, 200, JSON.stringify(grantGroup.data));

    const groups = await api(`/api/agents/${agentKey}/share/groups?limit=50`);
    assert.equal(groups.status, 200, JSON.stringify(groups.data));
    const groupRow = groups.data.documents.find((g) => String(g._id) === groupId);
    assert.ok(groupRow);
    assert.equal(groupRow.accessRoleId, 'agent_viewer');

    const revoke = await api(`/api/agents/${agentKey}/share`, {
      method: 'PUT',
      body: {
        principalType: 'user',
        principalId: otherUserId,
        accessRoleId: null,
      },
    });
    assert.equal(revoke.status, 200, JSON.stringify(revoke.data));
    assert.equal(revoke.data.accessRoleId, null);

    const usersAfter = await api(
      `/api/agents/${agentKey}/share/users?search=Other%20Owner&limit=20`,
    );
    const revokedRow = usersAfter.data.documents.find((u) => String(u._id) === otherUserId);
    assert.equal(revokedRow?.accessRoleId ?? null, null);
  });

  it('UPDATE advanced fields and reassign owner', async () => {
    const res = await api(`/api/agents/${agentKey}`, {
      method: 'PUT',
      body: {
        name: 'Share Agent Updated',
        provider: 'openAI',
        model: 'gpt-4o',
        avatar: 'https://example.com/new.png',
        model_parameters: { temperature: 0.2 },
        conversation_starters: ['Nuevo starter'],
        ownerId: otherUserId,
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const detail = await api(`/api/agents/${agentKey}`);
    assert.equal(String(detail.data.document.author), otherUserId);
    assert.equal(detail.data.document.avatar?.filepath, 'https://example.com/new.png');
    assert.equal(detail.data.document.model_parameters?.temperature, 0.2);
    assert.deepEqual(detail.data.document.conversation_starters, ['Nuevo starter']);

    const db = getWriteDB();
    const acl = await db
      .collection('aclentries')
      .find({
        resourceId: new ObjectId(mongoId),
        principalId: new ObjectId(otherUserId),
        resourceType: 'agent',
      })
      .toArray();
    assert.ok(acl.length >= 1);
    assert.ok((Number(acl[0].permBits) & 4) > 0 || (Number(acl[0].permBits) & 8) > 0);
  });

  it('DELETE agent removes ACL entries', async () => {
    const res = await api(`/api/agents/${agentKey}`, { method: 'DELETE' });
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const db = getWriteDB();
    const leftover = await db.collection('aclentries').countDocuments({
      resourceId: new ObjectId(mongoId),
    });
    assert.equal(leftover, 0);
    agentKey = '';
    mongoId = '';
  });
});
