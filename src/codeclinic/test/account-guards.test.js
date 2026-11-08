const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const { createAccountGuards, canActOnTarget, canListAccountType, SESSION_COOKIE } = require('../server/account/guards');

const sha = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const token = (c) => c.repeat(43);

const USERS = {
  student: { userId: 'student', accountType: 'STUDENT', accountStatus: 'ACTIVE' },
  student2: { userId: 'student2', accountType: 'STUDENT', accountStatus: 'ACTIVE' },
  ta: { userId: 'ta', accountType: 'TA', accountStatus: 'ACTIVE', isManager: false },
  ta2: { userId: 'ta2', accountType: 'TA', accountStatus: 'ACTIVE', isManager: false },
  coord: { userId: 'coord', accountType: 'TA', accountStatus: 'ACTIVE', isManager: true },
  inactive: { userId: 'inactive', accountType: 'STUDENT', accountStatus: 'INACTIVE' },
  forced: { userId: 'forced', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true },
};
const COOKIE_CHAR = { student: 'a', ta: 'b', coord: 'c', inactive: 'd', forced: 'e', ta2: 'f' };
const CSRF = token('z');

function setup({ failGetSession = false, failAccount = false, touch = true } = {}) {
  const sessions = new Map();
  for (const [name, c] of Object.entries(COOKIE_CHAR)) {
    sessions.set(sha(token(c)), { userId: name, accountTypeAtIssue: USERS[name].accountType, csrfTokenHash: sha(CSRF) });
  }
  const authStore = {
    deleted: [],
    async getSession(idHash) { if (failGetSession) throw new Error('down'); return sessions.get(idHash) || null; },
    async touchSession() { return touch; },
    async deleteSession(idHash) { this.deleted.push(idHash); sessions.delete(idHash); },
  };
  const accountStore = {
    async getAccount(userId) { if (failAccount) throw new Error('down'); return USERS[userId] ? { ...USERS[userId] } : null; },
  };
  const guards = createAccountGuards({ authStore, accountStore });
  const app = express();
  app.use(express.json());
  const echo = (req, res) => res.json({ actor: req.actor, type: req.supportListType, target: req.supportTarget });
  app.get('/me', guards.requireActiveActor, guards.requireCsrf, echo);
  app.post('/me', guards.requireActiveActor, guards.requireCsrf, echo);
  app.post('/csrf-only', guards.requireCsrf, echo);
  app.get('/list', guards.requireActiveActor, guards.requireSupportListAccess, echo);
  app.post('/target/:userId', guards.requireActiveActor, guards.requireCsrf, guards.requireSupportTarget, echo);
  app.get('/list-no-auth', guards.requireSupportListAccess, echo);
  app.get('/target-no-auth/:userId', guards.requireSupportTarget, echo);
  return { app, authStore, sessions };
}

const cookieFor = (name) => `${SESSION_COOKIE}=${token(COOKIE_CHAR[name])}`;

describe('pure R4 helpers', () => {
  test('canListAccountType', () => {
    expect(canListAccountType(USERS.student, 'STUDENT')).toBe(false);
    expect(canListAccountType(USERS.ta, 'STUDENT')).toBe(true);
    expect(canListAccountType(USERS.ta, 'TA')).toBe(false);
    expect(canListAccountType(USERS.coord, 'TA')).toBe(true);
    expect(canListAccountType(USERS.coord, 'STUDENT')).toBe(true);
    expect(canListAccountType({ accountType: 'TA', isManager: 'true' }, 'TA')).toBe(false);
    expect(canListAccountType(null, 'STUDENT')).toBe(false);
  });

  test('canActOnTarget', () => {
    expect(canActOnTarget(USERS.ta, USERS.student)).toBe(true);
    expect(canActOnTarget(USERS.ta, USERS.ta2)).toBe(false);
    expect(canActOnTarget(USERS.ta, USERS.ta)).toBe(false);
    expect(canActOnTarget(USERS.student, USERS.student2)).toBe(false);
    expect(canActOnTarget(USERS.student, USERS.student)).toBe(false);
    expect(canActOnTarget(USERS.coord, USERS.ta)).toBe(true);
    expect(canActOnTarget(USERS.coord, USERS.student)).toBe(true);
    expect(canActOnTarget(USERS.coord, USERS.coord)).toBe(false);
    expect(canActOnTarget(USERS.coord, { userId: 'x', accountType: 'ADMIN' })).toBe(false);
    expect(canActOnTarget(USERS.coord, null)).toBe(false);
  });
});

describe('construction', () => {
  test('uses the session cookie name issued by login', () => {
    expect(SESSION_COOKIE).toBe(require('../server/auth/login').SESSION_COOKIE);
  });

  test('requires the auth and account stores', () => {
    expect(() => createAccountGuards()).toThrow(TypeError);
    expect(() => createAccountGuards({ authStore: { getSession() {}, touchSession() {}, deleteSession() {} } })).toThrow(TypeError);
  });
});

describe('requireActiveActor', () => {
  test('sets the actor from the stored record', async () => {
    const { app } = setup();
    const res = await request(app).get('/me').set('Cookie', cookieFor('coord'));
    expect(res.status).toBe(200);
    expect(res.body.actor).toEqual({
      userId: 'coord', accountType: 'TA', isManager: true, mustChangePassword: false, sessionIdHash: sha(token('c')),
    });
  });

  test('exposes mustChangePassword without enforcing it', async () => {
    const { app } = setup();
    const res = await request(app).get('/me').set('Cookie', cookieFor('forced'));
    expect(res.status).toBe(200);
    expect(res.body.actor.mustChangePassword).toBe(true);
  });

  test.each([
    ['no cookie', undefined],
    ['malformed cookie', `${SESSION_COOKIE}=short`],
    ['unknown session', `${SESSION_COOKIE}=${token('q')}`],
  ])('returns 401 for %s and clears the cookie', async (_label, cookie) => {
    const { app } = setup();
    const req = request(app).get('/me');
    if (cookie) req.set('Cookie', cookie);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie'][0]).toMatch(/Max-Age=0/);
  });

  test('rejects and deletes the session of an inactive user', async () => {
    const { app, authStore } = setup();
    const res = await request(app).get('/me').set('Cookie', cookieFor('inactive'));
    expect(res.status).toBe(401);
    expect(authStore.deleted).toEqual([sha(token('d'))]);
  });

  test('rejects a session whose issued type no longer matches the stored type', async () => {
    const { app, sessions, authStore } = setup();
    sessions.get(sha(token('a'))).accountTypeAtIssue = 'TA';
    const res = await request(app).get('/me').set('Cookie', cookieFor('student'));
    expect(res.status).toBe(401);
    expect(authStore.deleted).toHaveLength(1);
  });

  test('returns 401 when the session has expired', async () => {
    const { app } = setup({ touch: false });
    expect((await request(app).get('/me').set('Cookie', cookieFor('student'))).status).toBe(401);
  });

  test('returns 503 on storage failure', async () => {
    expect((await request(setup({ failGetSession: true }).app).get('/me').set('Cookie', cookieFor('student'))).status).toBe(503);
    expect((await request(setup({ failAccount: true }).app).get('/me').set('Cookie', cookieFor('student'))).status).toBe(503);
  });

  test('ignores client-supplied role, manager, and ID fields', async () => {
    const { app } = setup();
    const res = await request(app).post('/me').set('Cookie', cookieFor('ta')).set('X-CSRF-Token', CSRF)
      .send({ userId: 'coord', accountType: 'TA', isManager: true, role: 'COORDINATOR' });
    expect(res.status).toBe(200);
    expect(res.body.actor).toMatchObject({ userId: 'ta', isManager: false });
  });
});

describe('requireCsrf', () => {
  test('does not require a token for safe methods', async () => {
    const { app } = setup();
    expect((await request(app).get('/me').set('Cookie', cookieFor('student'))).status).toBe(200);
  });

  test.each([
    ['missing', undefined],
    ['malformed', 'short'],
    ['wrong', token('y')],
  ])('returns 403 for a %s token on a state-changing request', async (_label, value) => {
    const { app } = setup();
    const req = request(app).post('/me').set('Cookie', cookieFor('student'));
    if (value) req.set('X-CSRF-Token', value);
    const res = await req;
    expect(res.status).toBe(403);
  });

  test('accepts the current token', async () => {
    const { app } = setup();
    expect((await request(app).post('/me').set('Cookie', cookieFor('student')).set('X-CSRF-Token', CSRF)).status).toBe(200);
  });

  test('rejects a token rotated away after authentication', async () => {
    const { app, sessions } = setup();
    sessions.get(sha(token('a'))).csrfTokenHash = sha(token('n'));
    expect((await request(app).post('/me').set('Cookie', cookieFor('student')).set('X-CSRF-Token', CSRF)).status).toBe(403);
  });

  test('returns 401 when no actor was authenticated', async () => {
    const { app } = setup();
    expect((await request(app).post('/csrf-only').set('X-CSRF-Token', CSRF)).status).toBe(401);
  });
});

describe('requireSupportListAccess', () => {
  test.each([
    ['ta', 'STUDENT', 200],
    ['ta', 'TA', 403],
    ['coord', 'TA', 200],
    ['coord', 'STUDENT', 200],
    ['student', 'STUDENT', 403],
    ['ta', 'ADMIN', 400],
    ['ta', undefined, 400],
  ])('%s listing %s returns %i', async (actor, type, status) => {
    const { app } = setup();
    const res = await request(app).get(type ? `/list?type=${type}` : '/list').set('Cookie', cookieFor(actor));
    expect(res.status).toBe(status);
    if (status === 200) expect(res.body.type).toBe(type);
  });

  test('a forged manager query field has no effect', async () => {
    const { app } = setup();
    expect((await request(app).get('/list?type=TA&isManager=true').set('Cookie', cookieFor('ta'))).status).toBe(403);
  });

  test('returns 401 without an actor', async () => {
    expect((await request(setup().app).get('/list-no-auth?type=STUDENT')).status).toBe(401);
  });
});

describe('requireSupportTarget', () => {
  test.each([
    ['ta', 'student', 200],
    ['ta', 'ta2', 403],
    ['ta', 'ta', 403],
    ['ta', 'coord', 403],
    ['student', 'student2', 403],
    ['student', 'student', 403],
    ['student', 'missing', 403],
    ['coord', 'ta', 200],
    ['coord', 'student', 200],
    ['coord', 'coord', 403],
    ['ta', 'missing', 404],
    ['coord', 'bad.id', 400],
  ])('%s acting on %s returns %i', async (actor, target, status) => {
    const { app } = setup();
    const res = await request(app).post(`/target/${target}`).set('Cookie', cookieFor(actor)).set('X-CSRF-Token', CSRF);
    expect(res.status).toBe(status);
    if (status === 200) {
      expect(res.body.target).toEqual({
        userId: target, accountType: USERS[target].accountType, accountStatus: USERS[target].accountStatus,
      });
    }
  });

  test('a forged target type in the body has no effect', async () => {
    const { app } = setup();
    const res = await request(app).post('/target/ta2').set('Cookie', cookieFor('ta')).set('X-CSRF-Token', CSRF)
      .send({ accountType: 'STUDENT' });
    expect(res.status).toBe(403);
  });

  test('requires CSRF before loading the target', async () => {
    const { app } = setup();
    expect((await request(app).post('/target/student').set('Cookie', cookieFor('ta'))).status).toBe(403);
  });

  test('returns 401 without an actor', async () => {
    expect((await request(setup().app).get('/target-no-auth/student')).status).toBe(401);
  });

  test('returns 503 when the target cannot be loaded', async () => {
    const guardsApp = express();
    const failing = createAccountGuards({
      authStore: { async getSession() { return null; }, async touchSession() { return true; }, async deleteSession() {} },
      accountStore: { async getAccount() { throw new Error('down'); } },
    });
    guardsApp.post('/t/:userId', (req, _res, next) => { req.actor = { userId: 'ta', accountType: 'TA', isManager: false }; next(); },
      failing.requireSupportTarget, (_req, res) => res.end());
    expect((await request(guardsApp).post('/t/student')).status).toBe(503);
  });
});
