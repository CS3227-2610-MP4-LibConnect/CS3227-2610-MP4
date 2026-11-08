const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const request = require('supertest');
const argon2 = require('argon2');
const {
  GENERIC_DENIAL,
  RETRY_MESSAGE,
  verifyCredentials,
  createLoginApp,
} = require('../server/auth/login');
const { emailKeyFor } = require('../server/auth/email');

const email = 'reader@example.test';
const canonicalEmail = 'reader@example.test';
const password = '  exact password  ';

function makeRepository({ mappings, user, error } = {}) {
  const key = emailKeyFor(canonicalEmail);
  return {
    findEmailKeyMatches: jest.fn(async (requestedKey) => {
      if (error) throw error;
      expect(requestedKey).toBe(key);
      return mappings === undefined ? [{ userId: 'synthetic-user' }] : mappings;
    }),
    getUserById: jest.fn(async (userId) => {
      if (error) throw error;
      if (userId !== 'synthetic-user') return null;
      expect(userId).toBe('synthetic-user');
      return user === undefined ? validUser : user;
    }),
  };
}

function makeApp(repository) {
  const sessions = new Map();
  const counters = new Map();
  const authStore = {
    reserveRateSlot: jest.fn(async (kind, identifier, limit, now, windowMs) => {
      const key = `${kind}:${identifier}`;
      const current = counters.get(key);
      if (!current || now >= current.started + windowMs) counters.set(key, { started: now, count: 0 });
      const active = counters.get(key);
      if (active.count >= limit) return false;
      active.count += 1;
      return true;
    }),
    releaseRateSlot: jest.fn(async (kind, identifier) => {
      const current = counters.get(`${kind}:${identifier}`);
      if (current) current.count = Math.max(0, current.count - 1);
    }),
    createSession: jest.fn(async (id, value) => sessions.set(id, value)),
    getSession: jest.fn(async (id) => sessions.get(id) || null),
    touchSession: jest.fn(async (id, lastSeenAt, expiresAt) => {
      const record = sessions.get(id);
      if (!record) return false;
      sessions.set(id, { ...record, lastSeenAt, expiresAt });
      return true;
    }),
    rotateCsrfToken: jest.fn(async (id, csrfTokenHash) => {
      sessions.set(id, { ...sessions.get(id), csrfTokenHash });
    }),
    deleteSession: jest.fn(async (id) => sessions.delete(id)),
    deleteSessionIfCsrfMatches: jest.fn(async (id, submittedHash) => {
      const current = sessions.get(id);
      if (!current || current.csrfTokenHash !== submittedHash) return false;
      sessions.delete(id);
      return true;
    }),
  };
  return { app: createLoginApp(repository, authStore), authStore, sessions, counters };
}

let validUser;

beforeAll(async () => {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  validUser = {
    userId: 'synthetic-user',
    email: 'Reader@Example.Test',
    canonicalEmailKey: canonicalEmail,
    passwordHash,
    accountType: 'STUDENT',
    accountStatus: 'ACTIVE',
  };
});

describe('T03 POST /api/auth/login', () => {
  test('canonicalizes email and accepts exact password only after T04 session creation', async () => {
    const repository = makeRepository();
    const { app, authStore } = makeApp(repository);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  READER@Example.Test  ', password, accountType: 'STUDENT' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accountType: 'STUDENT' });
    expect(response.headers['set-cookie'][0]).toContain('__Host-libconnect_session=');
    expect(authStore.createSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toContain(validUser.passwordHash);
    expect(repository.findEmailKeyMatches).toHaveBeenCalledTimes(1);
  });

  test('proves valid credentials internally without treating T03 as login success', async () => {
    const result = await verifyCredentials(makeRepository(), {
      email,
      password,
      accountType: 'STUDENT',
    });
    expect(result).toEqual({ passwordMatched: true, userId: 'synthetic-user', accountType: 'STUDENT' });
  });

  test('unknown email runs a valid dummy Argon2id verification', async () => {
    const verifyOriginal = argon2.verify.bind(argon2);
    const verifySpy = jest.spyOn(argon2, 'verify');
    try {
    const response = await request(makeApp(makeRepository({ mappings: [] })).app)
        .post('/api/auth/login')
        .send({ email, password, accountType: 'STUDENT' });

      expect(response.status).toBe(401);
      expect(verifySpy).toHaveBeenCalledWith(expect.stringMatching(/^\$argon2id\$v=19\$/), password);
      const dummyHash = verifySpy.mock.calls[0][0];
      await expect(verifyOriginal(dummyHash, 'synthetic-dummy-value')).resolves.toBe(true);
    } finally {
      verifySpy.mockRestore();
    }
  });

  test.each([
    ['inactive account', { accountStatus: 'INACTIVE' }, 'STUDENT'],
    ['selected type mismatch', { accountType: 'TA' }, 'STUDENT'],
  ])('keeps %s as password evidence only and never establishes a login', async (_label, override, selectedType) => {
    const repository = makeRepository({ user: { ...validUser, ...override } });
    const evidence = await verifyCredentials(repository, { email, password, accountType: selectedType });
    expect(evidence.passwordMatched).toBe(true);

    const response = await request(makeApp(repository).app).post('/api/auth/login')
      .send({ email, password, accountType: selectedType });
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test.each([
    ['missing email', { password, accountType: 'STUDENT' }],
    ['non-string email', { email: 123, password, accountType: 'STUDENT' }],
    ['missing password', { email, accountType: 'STUDENT' }],
    ['wrong account type', { email, password, accountType: 'MANAGER' }],
    ['whitespace email', { email: '  ', password, accountType: 'STUDENT' }],
    ['whitespace password', { email, password: ' \t ', accountType: 'STUDENT' }],
    ['email over limit', { email: `${'a'.repeat(250)}@test.test`, password, accountType: 'STUDENT' }],
    ['password over limit', { email, password: 'p'.repeat(1025), accountType: 'STUDENT' }],
  ])('returns 400 for %s before repository access', async (_label, body) => {
    const repository = makeRepository();
    const response = await request(makeApp(repository).app).post('/api/auth/login').send(body);
    expect(response.status).toBe(400);
    expect(repository.findEmailKeyMatches).not.toHaveBeenCalled();
  });

  test('rejects malformed JSON and oversized bodies with a bounded response', async () => {
    const app = makeApp(makeRepository()).app;
    const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{');
    expect(malformed.status).toBe(400);
    const oversized = await request(app).post('/api/auth/login').set('Content-Type', 'application/json')
      .send(JSON.stringify({ email, password: 'p'.repeat(9000), accountType: 'STUDENT' }));
    expect(oversized.status).toBe(400);
  });

  test('denies incorrect passwords with a generic response', async () => {
    const response = await request(makeApp(makeRepository()).app).post('/api/auth/login')
      .send({ email, password: 'wrong password', accountType: 'STUDENT' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: GENERIC_DENIAL });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test.each([
    ['missing mapping', []],
    ['duplicate mappings', [{ userId: 'synthetic-user' }, { userId: 'synthetic-user' }]],
    ['malformed mapping', [{ userId: 7 }]],
    ['mapping to absent user', [{ userId: 'unknown-user' }]],
  ])('fails closed for %s', async (_label, mappings) => {
    const response = await request(makeApp(makeRepository({ mappings })).app).post('/api/auth/login')
      .send({ email, password, accountType: 'STUDENT' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: GENERIC_DENIAL });
  });

  test.each([
    ['email mismatch', { canonicalEmailKey: 'other@example.test' }],
    ['original email mismatch', { email: 'someone-else@example.test' }],
    ['password hash malformed', { passwordHash: 'plaintext' }],
    ['invalid user ID', { userId: 'different-user' }],
    ['missing user record', null],
  ])('fails closed for %s', async (_label, override) => {
    const user = override === null ? null : { ...validUser, ...override };
    const response = await request(makeApp(makeRepository({ user })).app).post('/api/auth/login')
      .send({ email, password, accountType: 'STUDENT' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: GENERIC_DENIAL });
  });

  test.each([
    ['former MEMBER account type', { accountType: 'MEMBER' }, 'STUDENT'],
    ['former LIBRARIAN account type', { accountType: 'LIBRARIAN' }, 'TA'],
    ['former memberId field instead of studentId', { memberId: 'synthetic-user' }, 'STUDENT'],
  ])('fails closed as malformed for a stored record with the %s', async (_label, override, selectedType) => {
    const repository = makeRepository({ user: { ...validUser, ...override } });
    const evidence = await verifyCredentials(repository, { email, password, accountType: selectedType });
    expect(evidence).toEqual({ passwordMatched: false });

    const { app, authStore } = makeApp(repository);
    const response = await request(app).post('/api/auth/login')
      .send({ email, password, accountType: selectedType });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: GENERIC_DENIAL });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(authStore.createSession).not.toHaveBeenCalled();
  });

  test.each(['MEMBER', 'LIBRARIAN'])('returns 400 for the former %s request value before repository access', async (accountType) => {
    const repository = makeRepository();
    const response = await request(makeApp(repository).app).post('/api/auth/login')
      .send({ email, password, accountType });
    expect(response.status).toBe(400);
    expect(repository.findEmailKeyMatches).not.toHaveBeenCalled();
  });

  test('returns a generic service error when the injected data adapter fails', async () => {
    const response = await request(makeApp(makeRepository({ error: new Error('synthetic outage') })).app)
      .post('/api/auth/login').send({ email, password, accountType: 'STUDENT' });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: RETRY_MESSAGE });
    expect(JSON.stringify(response.body)).not.toContain('synthetic outage');
  });
});
