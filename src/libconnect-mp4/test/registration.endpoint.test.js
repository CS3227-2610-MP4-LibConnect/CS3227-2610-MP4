const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const request = require('supertest');
const { createServerApp } = require('../server');

const member = { accountType: 'MEMBER', name: ' Test Reader ', email: ' Reader@Example.Test ', password: '  synthetic passphrase  ' };

function system() {
  const created = [];
  const counts = new Map();
  const persistence = {
    async createAccount(input) { created.push(input); },
  };
  const authStore = {
    async reserveRateSlot(kind, source, limit, _now, windowMs) {
      expect(kind).toBe('registration-source');
      expect(limit).toBe(5);
      expect(windowMs).toBe(15 * 60 * 1000);
      const count = counts.get(source) || 0;
      if (count >= limit) return false;
      counts.set(source, count + 1);
      return true;
    },
    async releaseRateSlot() {},
    async createSession() { throw new Error('registration must not create a session'); },
    async getSession() { return null; },
    async touchSession() { return false; },
    async rotateCsrfToken() {},
    async deleteSession() {},
    async deleteSessionIfCsrfMatches() { return false; },
  };
  const db = { collection() { return { doc() { return { async get() { return { exists: false }; } }; } }; } };
  return { app: createServerApp(db, undefined, authStore, persistence), persistence, created, counts };
}

describe('registration endpoint boundary', () => {
  test.each([
    ['MEMBER', 'a@b.c', 'a@b.c'],
    ['MEMBER', 'a.b@sub.example.com', 'a.b@sub.example.com'],
    ['MEMBER', '  A.B@Sub.Example.Com  ', 'A.B@Sub.Example.Com'],
    ['LIBRARIAN', 'a@b.c', 'a@b.c'],
    ['LIBRARIAN', 'a.b@sub.example.com', 'a.b@sub.example.com'],
    ['LIBRARIAN', '  A.B@Sub.Example.Com  ', 'A.B@Sub.Example.Com'],
  ])('accepts %s email %s and passes trimmed case %s to persistence', async (accountType, email, storedEmail) => {
    const { app, created } = system();
    const body = { ...member, accountType, email,
      ...(accountType === 'LIBRARIAN' ? { employeeId: 'EMP-123' } : {}) };
    const response = await request(app).post('/api/auth/register').send(body);
    expect(response.status).toBe(201);
    expect(created).toHaveLength(1);
    expect(created[0].email).toBe(storedEmail);
    expect(created[0].canonicalEmail).toBe(storedEmail.toLowerCase());
  });

  test.each(['MEMBER', 'LIBRARIAN'].flatMap((accountType) => [
    'ab.c', '@b.c', 'a@', 'a@b', 'a@@b.c', 'a@b@c.d',
    '.a@b.c', 'a.@b.c', 'a..b@c.d', 'a@.b.c', 'a@b.c.', 'a@b..c',
    'a b@c.d', 'a@b c.d', 'a@b. c',
  ].map((email) => [accountType, email])))('rejects %s invalid email %s before persistence or rate reservation', async (accountType, email) => {
    const { app, created, counts } = system();
    const body = { ...member, accountType, email,
      ...(accountType === 'LIBRARIAN' ? { employeeId: 'EMP-123' } : {}) };
    const response = await request(app).post('/api/auth/register').send(body);
    expect(response.status).toBe(400);
    expect(created).toHaveLength(0);
    expect(counts.size).toBe(0);
  });

  test.each([
    [member, 'ACTIVE'],
    [{ ...member, accountType: 'LIBRARIAN', employeeId: ' EMP-123 ' }, 'INACTIVE'],
  ])('accepts valid type with server-controlled status and minimal response', async (body, expectedStatus) => {
    const { app, created } = system();
    const response = await request(app).post('/api/auth/register').send(body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ accountType: body.accountType, accountStatus: expectedStatus });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      accountType: body.accountType, accountStatus: expectedStatus,
      name: 'Test Reader', email: 'Reader@Example.Test', canonicalEmail: 'reader@example.test',
      password: body.password,
    });
    if (body.accountType === 'LIBRARIAN') {
      expect(created[0]).toMatchObject({ employeeId: 'EMP-123', isManager: false });
    } else {
      expect(created[0]).not.toHaveProperty('employeeId');
      expect(created[0]).not.toHaveProperty('isManager');
    }
    expect(JSON.stringify(response.body)).not.toMatch(/Reader|passphrase|password|employeeId|userId|isManager/i);
  });

  test.each([
    ['missing name', { ...member, name: undefined }],
    ['blank name', { ...member, name: '  ' }],
    ['name bytes', { ...member, name: 'é'.repeat(101) }],
    ['email type', { ...member, email: 23 }],
    ['email bytes', { ...member, email: `${'a'.repeat(250)}@example.test` }],
    ['short password', { ...member, password: 'short' }],
    ['password bytes', { ...member, password: 'x'.repeat(1025) }],
    ['unsupported type', { ...member, accountType: 'MANAGER' }],
    ['librarian missing ID', { ...member, accountType: 'LIBRARIAN' }],
    ['librarian blank ID', { ...member, accountType: 'LIBRARIAN', employeeId: ' ' }],
    ['librarian ID bytes', { ...member, accountType: 'LIBRARIAN', employeeId: 'é'.repeat(33) }],
    ['member ID', { ...member, employeeId: 'EMP-123' }],
    ...['isManager', 'accountStatus', 'userId', 'memberId', 'registrationDateTime', 'passwordHash', 'confirmPassword']
      .map((key) => [key, { ...member, [key]: 'forged' }]),
  ])('rejects %s before persistence', async (_label, body) => {
    const { app, created, counts } = system();
    const response = await request(app).post('/api/auth/register').send(body);
    expect(response.status).toBe(400);
    expect(created).toHaveLength(0);
    expect(counts.size).toBe(0);
  });

  test('malformed and oversized JSON have no write', async () => {
    const { app, created } = system();
    const malformed = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{');
    const oversized = await request(app).post('/api/auth/register').set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...member, extra: 'x'.repeat(8200) }));
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(created).toHaveLength(0);
  });

  test('five direct-source attempts exhaust a shared isolated counter', async () => {
    const { app, created } = system();
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/api/auth/register').send({ ...member, email: `reader${i}@example.test` })).status).toBe(201);
    }
    const sixth = await request(app).post('/api/auth/register').set('X-Forwarded-For', '203.0.113.7')
      .send({ ...member, email: 'reader5@example.test' });
    expect(sixth.status).toBe(429);
    expect(created).toHaveLength(5);
  });

  test.each([
    ['ALREADY_EXISTS', 409], ['storage failure', 503],
  ])('redacts %s persistence failure', async (code, status) => {
    const { app, persistence } = system();
    persistence.createAccount = async () => { throw Object.assign(new Error('synthetic private input'), { code }); };
    const response = await request(app).post('/api/auth/register').send(member);
    expect(response.status).toBe(status);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/private|Reader|passphrase|MEMBER|ACTIVE/i);
  });
});
