/** @jest-environment node */
const crypto = require('crypto');
const request = require('supertest');
const { createLoginApp } = require('../server/auth/login');
const { encodeCursor, normalizeFilters } = require('../server/catalog/adapter');

const token = 'a'.repeat(43);
const hash = crypto.createHash('sha256').update(token).digest('hex');
const cookie = `__Host-libconnect_session=${token}`;

function system({ role = 'MEMBER', status = 'ACTIVE', expired = false, failSession = false, failBooks = false, docs = [] } = {}) {
  const state = { role, status, expired, reads: 0, accountReads: 0 };
  const repository = {
    async findEmailKeyMatches() { return []; },
    async getUserById(id) {
      state.accountReads += 1;
      return id === 'synthetic-user' ? { userId: id, accountStatus: state.status, accountType: state.role } : null;
    },
  };
  const store = {
    async reserveRateSlot() { return true; }, async releaseRateSlot() {}, async createSession() {},
    async getSession(idHash) {
      if (failSession) throw new Error('synthetic session outage');
      return idHash === hash ? { userId: 'synthetic-user', accountTypeAtIssue: role } : null;
    },
    async touchSession() { return !state.expired; }, async rotateCsrfToken() {},
    async deleteSession() {}, async deleteSessionIfCsrfMatches() { return true; },
  };
  const db = {
    collection(name) {
      expect(name).toBe('books');
      let pageSize;
      let after;
      return {
        select() { return this; }, orderBy(field) { expect(field).toBe('__name__'); return this; },
        limit(n) { pageSize = n; return this; }, startAfter(id) { after = id; return this; },
        async get() {
          state.reads += 1;
          if (failBooks) throw new Error('synthetic Book text should not leak');
          return { docs: docs.filter((doc) => !after || doc.id > after).slice(0, pageSize) };
        },
      };
    },
  };
  return { app: createLoginApp(repository, store, { catalogDb: db }), state };
}

const book = (id, changes = {}) => ({ id, data: () => ({ isbn: id, title: 'Synthetic title',
  author: 'Synthetic author', publicationYear: 2000, synopsis: '<script>literal</script>',
  privateNote: 'private synthetic note', ...changes }) });

test('returns only approved fields and traverses filtered raw pages', async () => {
  const { app, state } = system({ docs: [book('1', { title: 'unrelated' }), book('2', { title: 'Tomcat' }), book('3', { title: 'Bottom' })] });
  const first = await request(app).get('/api/member/catalog?q=tom&pageSize=2').set('Cookie', cookie);
  expect(first.status).toBe(200);
  expect(first.body.books).toEqual([{ isbn: '2', title: 'Tomcat', author: 'Synthetic author', synopsis: '<script>literal</script>' }]);
  expect(Object.keys(first.body).sort()).toEqual(['books', 'nextCursor', 'scanComplete', 'scannedAnyDocument', 'scannedValidBooks']);
  expect(JSON.stringify(first.body)).not.toContain('private synthetic note');
  const next = await request(app).get(`/api/member/catalog?q=tom&pageSize=2&cursor=${first.body.nextCursor}`).set('Cookie', cookie);
  expect(next.body.books.map((entry) => entry.isbn)).toEqual(['3']);
  expect(next.body.scanComplete).toBe(true);
  expect(state.accountReads).toBe(2);
  expect(state.reads).toBe(2);
});

test('empty collection gives globally empty flags and no Book data', async () => {
  const result = await request(system().app).get('/api/member/catalog').set('Cookie', cookie);
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ books: [], nextCursor: null, scannedAnyDocument: false, scannedValidBooks: false, scanComplete: true });
});

test('unauthenticated, expired, inactive, and role-changed sessions deny before Book access', async () => {
  const unauth = system();
  const noCookie = await request(unauth.app).get('/api/member/catalog');
  expect(noCookie.status).toBe(401);
  expect(noCookie.body).toEqual({ error: { code: 'UNAUTHENTICATED' } });
  expect(unauth.state.reads).toBe(0);
  for (const config of [{ expired: true }, { status: 'INACTIVE' }, { role: 'LIBRARIAN' }]) {
    const unit = system(config);
    const result = await request(unit.app).get('/api/member/catalog?role=MEMBER').set('Cookie', cookie);
    expect(result.status).toBe(config.role ? 403 : 401);
    expect(result.body.books).toBeUndefined();
    expect(unit.state.reads).toBe(0);
  }
  const changed = system();
  changed.state.role = 'LIBRARIAN';
  const result = await request(changed.app).get('/api/member/catalog').set('Cookie', cookie);
  expect(result.status).toBe(401);
  expect(changed.state.reads).toBe(0);
});

test.each([
  '?role=MEMBER', '?status=ACTIVE', '?isManager=true', '?owner=synthetic',
  '?q=a&q=b', '?title=%ZZ', '?minYear=1449', '?minYear=2101', '?minYear=1999.5',
  '?minYear=2001&maxYear=2000', '?pageSize=0', '?pageSize=101', '?pageSize=01',
  '?cursor=bad', '?q=' + 'x'.repeat(101), '?q=' + 'x'.repeat(257),
])('rejects malformed or forged query %s before Book access', async (suffix) => {
  const unit = system();
  const result = await request(unit.app).get('/api/member/catalog' + suffix).set('Cookie', cookie);
  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: { code: 'INVALID_QUERY' } });
  expect(unit.state.reads).toBe(0);
});

test('rejects cursor filter, page-size, encoding, schema, and ID mismatches', async () => {
  const filters = normalizeFilters({ q: 'tom' });
  const valid = encodeCursor('1', filters, 2);
  const wrongId = Buffer.from(JSON.stringify({ v: 1, after: '../bad', filterHash: '0'.repeat(64), pageSize: 2 })).toString('base64url');
  const extra = Buffer.from(JSON.stringify({ v: 1, after: '1', filterHash: '0'.repeat(64), pageSize: 2, extra: true })).toString('base64url');
  const unit = system();
  for (const suffix of [`?q=other&pageSize=2&cursor=${valid}`, `?q=tom&pageSize=3&cursor=${valid}`,
    `?q=tom&pageSize=2&cursor=${valid}=`, `?q=tom&pageSize=2&cursor=${wrongId}`,
    `?q=tom&pageSize=2&cursor=${extra}`]) {
    const result = await request(unit.app).get('/api/member/catalog' + suffix).set('Cookie', cookie);
    expect(result.status).toBe(400);
  }
  expect(unit.state.reads).toBe(0);
});

test('session and Book service failures return non-sensitive 503', async () => {
  for (const config of [{ failSession: true }, { failBooks: true }]) {
    const result = await request(system(config).app).get('/api/member/catalog').set('Cookie', cookie);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: { code: 'CATALOG_UNAVAILABLE' } });
    expect(JSON.stringify(result.body)).not.toMatch(/synthetic|private|session/i);
  }
});
