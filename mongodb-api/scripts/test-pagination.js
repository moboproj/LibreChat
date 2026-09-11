const assert = require('assert');
const { parsePagination, paginatedResponse, escapeRegex } = require('../utils/pagination');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('escapeRegex escapes special chars', () => {
  assert.strictEqual(escapeRegex('a+b'), 'a\\+b');
  assert.strictEqual(escapeRegex('.*'), '\\.\\*');
});

test('parsePagination defaults', () => {
  const p = parsePagination({});
  assert.strictEqual(p.page, 1);
  assert.strictEqual(p.limit, 10);
  assert.strictEqual(p.skip, 0);
});

test('parsePagination clamps and searches', () => {
  const p = parsePagination({ page: '2', limit: '50', search: 'foo.bar' });
  assert.strictEqual(p.page, 2);
  assert.strictEqual(p.limit, 50);
  assert.strictEqual(p.skip, 50);
  assert.strictEqual(p.search, 'foo\\.bar');
});

test('parsePagination max limit', () => {
  const p = parsePagination({ limit: '999' });
  assert.strictEqual(p.limit, 100);
});

test('paginatedResponse shape', () => {
  const r = paginatedResponse({ documents: [1, 2], total: 25, page: 2, limit: 10 });
  assert.strictEqual(r.totalPages, 3);
  assert.strictEqual(r.pageSize, 10);
  assert.deepStrictEqual(r.documents, [1, 2]);
});

if (!process.exitCode) {
  console.log('All pagination tests passed');
}
