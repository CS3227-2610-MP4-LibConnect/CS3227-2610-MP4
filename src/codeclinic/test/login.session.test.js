const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const request = require('supertest');
const argon2 = require('argon2');
const { createLoginApp, emailKeyFor, GENERIC_DENIAL, RETRY_MESSAGE } = require('../server/auth/login');

const email = 'member@example.test';
const password = 'synthetic passphrase';
let account;

function makeSystem({ user = account, repositoryError, storeError, createError, clock } = {}) {
  const sessions = new Map();
  const counters = new Map();
  const operationLog = [];
  const repository = {
    async findEmailKeyMatches(key) {
      if (repositoryError) throw repositoryError;
      return key === emailKeyFor(email) && user ? [{ userId: user.userId }] : [];
    },
    async getUserById(userId) {
      if (repositoryError) throw repositoryError;
      return user && userId === user.userId ? user : null;
    },
  };
  const authStore = {
    async reserveRateSlot(kind, identifier, limit, now, windowMs) {
      if (storeError) throw storeError;
      const key = `${kind}:${identifier}`;
      const current = counters.get(key);
      if (!current || now >= current.started + windowMs) counters.set(key, { started: now, count: 0 });
      const state = counters.get(key);
      if (state.count >= limit) return false;
      state.count += 1;
      return true;
    },
    async releaseRateSlot(kind, identifier) {
      const state = counters.get(`${kind}:${identifier}`);
      if (state) state.count = Math.max(0, state.count - 1);
    },
    async createSession(idHash, record) {
      if (storeError || createError) throw storeError || createError;
      if (sessions.has(idHash)) throw new Error('duplicate');
      sessions.set(idHash, record);
      operationLog.push('session-created');
    },
    async getSession(idHash) {
      if (storeError) throw storeError;
      return sessions.get(idHash) || null;
    },
    async touchSession(idHash, lastSeenAt, expiresAt) {
      const current = sessions.get(idHash);
      if (!current) return false;
      const time = typeof lastSeenAt === 'function' ? lastSeenAt() : lastSeenAt;
      const issued = new Date(current.issuedAt).getTime();
      const previous = new Date(current.lastSeenAt).getTime();
      const absolute = 8 * 60 * 60 * 1000;
      const idle = 30 * 60 * 1000;
      if (time < previous) return false;
      if (time - previous >= idle || time - issued >= absolute || time >= new Date(current.expiresAt).getTime()) {
        sessions.delete(idHash);
        return false;
      }
      sessions.set(idHash, { ...current, lastSeenAt: time, expiresAt: Math.min(issued + absolute, time + idle) });
      return true;
    },
    async rotateCsrfToken(idHash, csrfTokenHash) {
      const current = sessions.get(idHash);
      if (!current) throw new Error('missing');
      sessions.set(idHash, { ...current, csrfTokenHash });
    },
    async deleteSessionIfCsrfMatches(idHash, submittedHash) {
      const current = sessions.get(idHash);
      if (!current || current.csrfTokenHash !== submittedHash) return false;
      sessions.delete(idHash);
      return true;
    },
    async deleteSession(idHash) { sessions.delete(idHash); },
  };
  const options = clock ? { now: clock } : {};
  const app = createLoginApp(repository, authStore, options);
  return { app, sessions, counters, operationLog, get user() { return user; }, set user(value) { user = value; } };
}

function cookieFrom(response) {
  const setCookie = response.headers['set-cookie'] || [];
  const line = setCookie.find((value) => value.startsWith('__Host-libconnect_session='));
  return line && line.split(';')[0];
}

beforeAll(async () => {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
  });
  account = {
    userId: 'synthetic-account',
    email,
    canonicalEmailKey: email,
    passwordHash,
    accountType: 'MEMBER',
    accountStatus: 'ACTIVE',
    isManager: false,
  };
});

describe('T04 authorization and server sessions', () => {
  test('returns only the verified member name alongside the session role', async () => {
    const system = makeSystem({ user: { ...account, name: ' Synthetic Reader ' } });
    const login = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    expect(login.body).toEqual({ accountType: 'MEMBER' });
    const session = await request(system.app).get('/api/auth/session').set('Cookie', cookieFrom(login));
    expect(session.body).toEqual({ accountType: 'MEMBER', name: 'Synthetic Reader' });
  });

  test.each(['MEMBER', 'LIBRARIAN'])('establishes durable success only for an active stored %s account', async (accountType) => {
    const system = makeSystem({ user: { ...account, accountType } });
    const response = await request(system.app).post('/api/auth/login')
      .send({ email, password, accountType, role: 'MANAGER', isManager: true, accountStatus: 'ACTIVE', userId: 'forged', passwordHash: 'forged' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accountType });
    expect(Object.keys(response.body)).toEqual(['accountType']);
    expect(system.sessions.size).toBe(1);
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toContain(account.passwordHash);
    const record = [...system.sessions.values()][0];
    expect(Object.keys(record).sort()).toEqual(['accountTypeAtIssue', 'csrfTokenHash', 'expiresAt', 'issuedAt', 'lastSeenAt', 'userId']);
    expect(JSON.stringify(record)).not.toContain(email);
    expect(JSON.stringify(record)).not.toContain(account.passwordHash);
    expect(JSON.stringify(response.body)).not.toContain(account.passwordHash);
  });

  test.each([
    ['member selected as librarian', 'MEMBER', 'ACTIVE', 'LIBRARIAN'],
    ['librarian selected as member', 'LIBRARIAN', 'ACTIVE', 'MEMBER'],
    ['inactive account', 'MEMBER', 'INACTIVE', 'MEMBER'],
  ])('uses a uniform denial and writes no session for %s', async (_label, accountType, accountStatus, selected) => {
    const system = makeSystem({ user: { ...account, accountType, accountStatus } });
    const response = await request(system.app).post('/api/auth/login').send({ email, password, accountType: selected });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: GENERIC_DENIAL });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(system.sessions.size).toBe(0);
  });

  test('does not create a session when session persistence fails', async () => {
    const system = makeSystem({ createError: new Error('synthetic store outage') });
    const response = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: RETRY_MESSAGE });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('synthetic store outage');
  });

  test('rechecks active status and stored role on protected routes', async () => {
    const system = makeSystem();
    const login = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    const cookie = cookieFrom(login);
    expect((await request(system.app).get('/api/auth/session').set('Cookie', cookie)).status).toBe(200);

    system.user = { ...account, accountStatus: 'INACTIVE' };
    const response = await request(system.app).get('/api/auth/session').set('Cookie', cookie);
    expect(response.status).toBe(401);
    expect(system.sessions.size).toBe(0);

    const roleSystem = makeSystem();
    const roleLogin = await request(roleSystem.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    roleSystem.user = { ...account, accountType: 'LIBRARIAN' };
    const roleResponse = await request(roleSystem.app).get('/api/auth/session').set('Cookie', cookieFrom(roleLogin));
    expect(roleResponse.status).toBe(401);
    expect(roleSystem.sessions.size).toBe(0);
  });

  test('enforces idle and absolute expiry at the server', async () => {
    let time = 1_800_000_000_000;
    const system = makeSystem({ clock: () => time });
    const login = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    const cookie = cookieFrom(login);
    time += 30 * 60 * 1000;
    expect((await request(system.app).get('/api/auth/session').set('Cookie', cookie)).status).toBe(401);
    expect(system.sessions.size).toBe(0);

    time += 1;
    const second = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    const secondCookie = cookieFrom(second);
    time += 8 * 60 * 60 * 1000;
    expect((await request(system.app).get('/api/auth/session').set('Cookie', secondCookie)).status).toBe(401);
  });

  test('requires CSRF on logout, then invalidates the durable session', async () => {
    const system = makeSystem();
    const login = await request(system.app).post('/api/auth/login').send({ email, password, accountType: 'MEMBER' });
    const cookie = cookieFrom(login);
    const missing = await request(system.app).post('/api/auth/logout').set('Cookie', cookie);
    expect(missing.status).toBe(403);
    expect(system.sessions.size).toBe(1);

    const csrf = await request(system.app).get('/api/auth/csrf').set('Cookie', cookie);
    expect(csrf.status).toBe(200);
    expect(typeof csrf.body.csrfToken).toBe('string');
    const logout = await request(system.app).post('/api/auth/logout').set('Cookie', cookie)
      .set('X-CSRF-Token', csrf.body.csrfToken);
    expect(logout.status).toBe(204);
    expect(system.sessions.size).toBe(0);
    expect(logout.headers['set-cookie'][0]).toContain('Max-Age=0');
    expect((await request(system.app).get('/api/auth/session').set('Cookie', cookie)).status).toBe(401);
  });

  test('applies five-failure canonical email limit without locking the account', async () => {
    const system = makeSystem();
    for (let index = 0; index < 5; index += 1) {
      const response = await request(system.app).post('/api/auth/login')
        .send({ email: ' MEMBER@EXAMPLE.TEST ', password: 'wrong', accountType: 'MEMBER' });
      expect(response.status).toBe(401);
    }
    const limited = await request(system.app).post('/api/auth/login')
      .send({ email, password, accountType: 'MEMBER' });
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ message: 'Unable to sign in right now. Please try again later.' });
    expect(system.sessions.size).toBe(0);
    expect(system.user.accountStatus).toBe('ACTIVE');
  });

  test('applies thirty-failure direct-source limit with generic 429', async () => {
    const system = makeSystem({ user: null });
    for (let index = 0; index < 30; index += 1) {
      const response = await request(system.app).post('/api/auth/login')
        .set('X-Forwarded-For', `203.0.113.${index + 1}`)
        .send({ email: `unknown${index}@example.test`, password: 'wrong', accountType: 'MEMBER' });
      expect(response.status).toBe(401);
    }
    const limited = await request(system.app).post('/api/auth/login')
      .send({ email: 'another@example.test', password: 'wrong', accountType: 'MEMBER' });
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ message: 'Unable to sign in right now. Please try again later.' });
    expect(system.sessions.size).toBe(0);
  });

  test('uses no forwarded headers as source identity and does not return private account data', async () => {
    const system = makeSystem();
    const response = await request(system.app).post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.9').send({ email, password, accountType: 'MEMBER' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accountType: 'MEMBER' });
    expect(JSON.stringify(response.body)).not.toMatch(/email|password|userId|manager|session/i);
  });
});
