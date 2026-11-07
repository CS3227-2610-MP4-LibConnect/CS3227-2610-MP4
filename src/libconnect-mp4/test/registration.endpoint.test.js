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
