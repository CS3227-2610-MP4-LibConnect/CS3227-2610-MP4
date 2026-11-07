const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const argon2 = require('argon2');
const request = require('supertest');
const { createServerApp } = require('../server');

const password = '  synthetic passphrase  ';
const member = { accountType: 'MEMBER', name: ' Test Reader ', email: ' Reader@Example.Test ', password };
const librarian = { ...member, accountType: 'LIBRARIAN', employeeId: ' EMP-123 ' };

function fakeSystem() {
  const records = new Map();
  const rateSlots = new Map();
  const sessions = new Map();
  let queue = Promise.resolve();
  let failCommit = false;
  let commitGate = null;
  const db = {
    collection(name) {
      return {
        doc(id) {
          return {
            path: `${name}/${id}`,
            async get() {
              const value = records.get(`${name}/${id}`);
              return { exists: value !== undefined, data: () => value };
            },
          };
        },
      };
    },
    runTransaction(callback) {
      const work = queue.then(async () => {
        const changes = new Map();
        const transaction = {
          async get(ref) {
            const value = records.get(ref.path);
            return { exists: value !== undefined, data: () => value };
          },
          create(ref, value) {
            if (records.has(ref.path) || changes.has(ref.path)) throw Object.assign(new Error('already exists'), { code: 6 });
            changes.set(ref.path, value);
          },
          set(ref, value) { changes.set(ref.path, value); },
        };
        const result = await callback(transaction);
        if (commitGate) await commitGate;
        if (failCommit) throw new Error('synthetic commit failure');
        for (const [key, value] of changes) records.set(key, value);
        return result;
      });
      queue = work.catch(() => undefined);
      return work;
    },
  };
  const authStore = {
    async reserveRateSlot(kind, identifier, limit, now, windowMs) {
      const key = `${kind}:${identifier}`;
      let state = rateSlots.get(key);
      if (!state || now >= state.started + windowMs) state = { started: now, count: 0 };
      rateSlots.set(key, state);
      if (state.count >= limit) return false;
      state.count += 1;
      return true;
    },
    async releaseRateSlot(kind, identifier) {
      const state = rateSlots.get(`${kind}:${identifier}`);
      if (state) state.count = Math.max(0, state.count - 1);
    },
    async createSession(idHash, session) { sessions.set(idHash, session); },
    async getSession() { return null; },
    async touchSession() { return false; },
    async rotateCsrfToken() {},
    async deleteSession() {},
    async deleteSessionIfCsrfMatches() { return false; },
  };
  const build = fs.mkdtempSync(path.join(os.tmpdir(), 'libconnect-registration-'));
  fs.writeFileSync(path.join(build, 'index.html'), '<!doctype html><title>LibConnect</title>');
  return {
    app: createServerApp(db, build, authStore), records, rateSlots, sessions,
    setFailCommit(value) { failCommit = value; },
    holdCommit(promise) { commitGate = promise; },
    cleanup() { fs.rmSync(build, { recursive: true, force: true }); },
  };
}

function users(system) {
  return [...system.records.entries()].filter(([key]) => key.startsWith('users/')).map(([, value]) => value);
}

function keys(system) {
  return [...system.records.entries()].filter(([key]) => key.startsWith('emailKeys/'));
}

describe('POST /api/auth/register', () => {
  let system;
  beforeEach(() => { system = fakeSystem(); });
  afterEach(() => system.cleanup());

  test.each(['MEMBER', 'LIBRARIAN'].flatMap((accountType) => [
    'ab.c', '@b.c', 'a@', 'a@b', 'a@@b.c', 'a@b@c.d',
    '.a@b.c', 'a.@b.c', 'a..b@c.d', 'a@.b.c', 'a@b.c.', 'a@b..c',
    'a b@c.d', 'a@b c.d', 'a@b. c',
  ].map((email) => [accountType, email])))('rejects direct %s invalid email %s with no user or key write', async (accountType, email) => {
    const body = { ...(accountType === 'MEMBER' ? member : librarian), email };
    const response = await request(system.app).post('/api/auth/register').send(body);
    expect(response.status).toBe(400);
    expect(users(system)).toHaveLength(0);
    expect(keys(system)).toHaveLength(0);
  });

  test.each(['MEMBER', 'LIBRARIAN'])('stores trimmed original-case %s email and lowercase canonical key', async (accountType) => {
    const body = { ...(accountType === 'MEMBER' ? member : librarian), email: '  A.B@Sub.Example.Com  ' };
    const response = await request(system.app).post('/api/auth/register').send(body);
    expect(response.status).toBe(201);
    expect(users(system)).toHaveLength(1);
    expect(users(system)[0].email).toBe('A.B@Sub.Example.Com');
    expect(users(system)[0].canonicalEmailKey).toBe('a.b@sub.example.com');
    expect(keys(system)).toHaveLength(1);
    expect(keys(system)[0][0]).toBe(`emailKeys/${crypto.createHash('sha256').update('a.b@sub.example.com').digest('hex')}`);
  });

  test.each([
    ['Member', member, 'ACTIVE'], ['Librarian', librarian, 'INACTIVE'],
  ])('commits a %s account with server-controlled identity and minimal success response', async (_label, body, expectedStatus) => {
    const response = await request(system.app).post('/api/auth/register').send(body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ accountType: body.accountType, accountStatus: expectedStatus });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(users(system)).toHaveLength(1);
    expect(keys(system)).toHaveLength(1);
    const user = users(system)[0];
    expect(user.userId).toEqual(expect.any(String));
    expect(user.userId).not.toBe('');
    expect(user.name).toBe('Test Reader');
    expect(user.email).toBe('Reader@Example.Test');
    expect(user.canonicalEmailKey).toBe('reader@example.test');
    expect(user.accountType).toBe(body.accountType);
    expect(user.accountStatus).toBe(expectedStatus);
    expect(user.registrationDateTime).toBeTruthy();
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/);
    const [, memory, iterations, parallelism] = user.passwordHash.match(/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/);
    expect(Number(memory)).toBeGreaterThanOrEqual(19456);
    expect(Number(iterations)).toBeGreaterThanOrEqual(2);
    expect(Number(parallelism)).toBe(1);
    await expect(argon2.verify(user.passwordHash, password)).resolves.toBe(true);
    expect(user.passwordHash).not.toBe(password);
    if (body.accountType === 'MEMBER') expect(user.memberId).toBe(user.userId);
    else {
      expect(user.employeeId).toBe('EMP-123');
      expect(user.isManager).toBe(false);
    }
    expect(keys(system)[0][0]).toBe(`emailKeys/${crypto.createHash('sha256').update('reader@example.test').digest('hex')}`);
    expect(keys(system)[0][1]).toEqual({ userId: user.userId });
    expect(JSON.stringify(response.body)).not.toMatch(/Reader|passphrase|passwordHash|userId|employeeId/i);
  });

  test('canonical duplicate across account types is a generic conflict with no second account', async () => {
    expect((await request(system.app).post('/api/auth/register').send(member)).status).toBe(201);
    const response = await request(system.app).post('/api/auth/register').send({ ...librarian, email: 'reader@example.test' });
    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('message', expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(/MEMBER|ACTIVE|Reader|EMP-123/i);
    expect(users(system)).toHaveLength(1);
    expect(keys(system)).toHaveLength(1);
  });

  test('concurrent canonical duplicates have one winner and no orphan', async () => {
    const responses = await Promise.all([
      request(system.app).post('/api/auth/register').send(member),
      request(system.app).post('/api/auth/register').send({ ...member, email: 'reader@example.test' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(users(system)).toHaveLength(1);
    expect(keys(system)).toHaveLength(1);
  });

  test('different accounts receive independently salted password hashes', async () => {
    const first = await request(system.app).post('/api/auth/register').send(member);
    const second = await request(system.app).post('/api/auth/register')
      .send({ ...member, email: 'other@example.test' });
    expect([first.status, second.status]).toEqual([201, 201]);
    const [firstUser, secondUser] = users(system);
    expect(firstUser.passwordHash).not.toBe(secondUser.passwordHash);
    await expect(argon2.verify(firstUser.passwordHash, password)).resolves.toBe(true);
    await expect(argon2.verify(secondUser.passwordHash, password)).resolves.toBe(true);
  });

  test('does not send success before both records commit', async () => {
    let releaseCommit;
    system.holdCommit(new Promise((resolve) => { releaseCommit = resolve; }));
    let responseReceived = false;
    const pending = request(system.app).post('/api/auth/register').send(member)
      .then((response) => { responseReceived = true; return response; });
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(responseReceived).toBe(false);
      expect(users(system)).toHaveLength(0);
      expect(keys(system)).toHaveLength(0);
    } finally {
      releaseCommit();
    }
    expect((await pending).status).toBe(201);
    expect(users(system)).toHaveLength(1);
    expect(keys(system)).toHaveLength(1);
  });

  test.each([
    ['missing name', { ...member, name: undefined }],
    ['blank name', { ...member, name: '  ' }],
    ['name over limit', { ...member, name: 'é'.repeat(101) }],
    ['wrong-type email', { ...member, email: 42 }],
    ['email over limit', { ...member, email: `${'a'.repeat(250)}@example.test` }],
    ['short password', { ...member, password: 'short' }],
    ['password over limit', { ...member, password: 'x'.repeat(1025) }],
    ['unsupported type', { ...member, accountType: 'MANAGER' }],
    ['missing employee ID', { ...librarian, employeeId: undefined }],
    ['blank employee ID', { ...librarian, employeeId: '  ' }],
    ['employee ID over limit', { ...librarian, employeeId: 'é'.repeat(33) }],
    ['member employee ID', { ...member, employeeId: 'EMP-123' }],
    ['forged manager flag', { ...librarian, isManager: true }],
    ['forged active status', { ...librarian, accountStatus: 'ACTIVE' }],
    ['forged user ID', { ...member, userId: 'attacker' }],
    ['forged member ID', { ...member, memberId: 'attacker' }],
    ['forged timestamp', { ...member, registrationDateTime: '2000-01-01' }],
    ['forged hash', { ...member, passwordHash: 'plaintext' }],
    ['unexpected property', { ...member, extra: 'value' }],
  ])('rejects %s before persistence', async (_label, body) => {
    const response = await request(system.app).post('/api/auth/register').send(body);
    expect(response.status).toBe(400);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(users(system)).toHaveLength(0);
    expect(keys(system)).toHaveLength(0);
  });

  test('rejects malformed and over-8 KiB JSON with no write', async () => {
    const malformed = await request(system.app).post('/api/auth/register').set('Content-Type', 'application/json').send('{');
    const oversized = await request(system.app).post('/api/auth/register').set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...member, extra: 'x'.repeat(8200) }));
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(users(system)).toHaveLength(0);
  });

  test('five direct-source attempts per 15 minutes are shared and enforced before a write', async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await request(system.app).post('/api/auth/register').send({ ...member, email: `reader${i}@example.test` });
      expect(response.status).toBe(201);
    }
    const sixth = await request(system.app).post('/api/auth/register').send({ ...member, email: 'reader5@example.test' });
    expect(sixth.status).toBe(429);
    expect(sixth.body).toHaveProperty('message', expect.any(String));
    expect(users(system)).toHaveLength(5);
  });

  test('a failed commit produces a non-sensitive retry response and no partial record', async () => {
    system.setFailCommit(true);
    const response = await request(system.app).post('/api/auth/register').send(member);
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toMatch(/Reader|passphrase|synthetic commit failure/i);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(users(system)).toHaveLength(0);
    expect(keys(system)).toHaveLength(0);
  });

  test('direct navigation and refresh at /register serve the frontend', async () => {
    const first = await request(system.app).get('/register');
    const second = await request(system.app).get('/register');
    expect(first.status).toBe(200);
    expect(first.text).toContain('<title>LibConnect</title>');
    expect(second.status).toBe(200);
  });

  test('new active Member signs in; new inactive Librarian is denied', async () => {
    const memberRegistration = await request(system.app).post('/api/auth/register').send(member);
    const librarianRegistration = await request(system.app).post('/api/auth/register')
      .send({ ...librarian, email: 'staff@example.test' });
    expect(memberRegistration.status).toBe(201);
    expect(librarianRegistration.status).toBe(201);
    expect(memberRegistration.headers['set-cookie']).toBeUndefined();
    expect(librarianRegistration.headers['set-cookie']).toBeUndefined();
    expect(system.sessions.size).toBe(0);

    const memberLogin = await request(system.app).post('/api/auth/login')
      .send({ accountType: 'MEMBER', email: ' reader@example.test ', password });
    expect(memberLogin.status).toBe(200);
    expect(memberLogin.body).toEqual({ accountType: 'MEMBER' });
    expect(memberLogin.headers['set-cookie']).toBeDefined();
    expect(system.sessions.size).toBe(1);

    const librarianLogin = await request(system.app).post('/api/auth/login')
      .send({ accountType: 'LIBRARIAN', email: 'staff@example.test', password });
    expect(librarianLogin.status).toBe(401);
    expect(librarianLogin.headers['set-cookie']).toBeUndefined();
    expect(system.sessions.size).toBe(1);
  });
});
