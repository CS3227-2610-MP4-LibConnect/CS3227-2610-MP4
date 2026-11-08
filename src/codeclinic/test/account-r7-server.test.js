const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = global.setImmediate || ((callback, ...args) => setTimeout(callback, 0, ...args));
const request = require('supertest');
const { createServerApp } = require('../server');
const { SESSION_COOKIE } = require('../server/auth/login');

const RAW_SESSION = 's'.repeat(43);
const RAW_CSRF = 'c'.repeat(43);
const sessionHash = crypto.createHash('sha256').update(RAW_SESSION).digest('hex');
const csrfHash = crypto.createHash('sha256').update(RAW_CSRF).digest('hex');
const user = {
  userId: 'u1', name: 'Ada', email: 'ada@example.edu', canonicalEmailKey: 'ada@example.edu',
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$MDEyMzQ1Njc4OWFiY2RlZg$9YWkgPbnBtCsQsBiGAJdRM2pfcLBgTIjg0QZVdkeeN0',
  accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true,
};

function makeApp() {
  const authStore = {
    getSession: async () => ({ userId: user.userId, accountTypeAtIssue: 'STUDENT', csrfTokenHash: csrfHash }),
    touchSession: async () => true, deleteSession: async () => {},
    deleteSessionIfCsrfMatches: async () => true, rotateCsrfToken: async () => {},
    reserveRateSlot: async () => true, releaseRateSlot: async () => {}, createSession: async () => {},
    deleteSessionsForUser: async () => 0,
  };
  const db = {
    collection(name) {
      return {
        doc(id) {
          return {
            get: async () => ({ exists: name === 'users' && id === user.userId, data: () => user }),
          };
        },
        where() { return this; }, orderBy() { return this; }, limit() { return this; },
        get: async () => ({ docs: [] }),
      };
    },
    runTransaction: async () => {},
  };
  return createServerApp(db, '/missing-build', authStore, { async createAccount() {} });
}

const cookie = `${SESSION_COOKIE}=${RAW_SESSION}`;

test('mounted R7 guard blocks account, support, and notifications but permits the limited password-change endpoints', async () => {
  const app = makeApp();
  for (const path of ['/api/account', '/api/account/profile', '/api/support/accounts?type=STUDENT', '/api/notifications/unread-count']) {
    const blocked = await request(app).get(path).set('Cookie', cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  }
  const session = await request(app).get('/api/auth/session').set('Cookie', cookie);
  expect(session.status).toBe(200);
  expect(session.body).toMatchObject({ accountType: 'STUDENT', mustChangePassword: true });
  const csrf = await request(app).get('/api/auth/csrf').set('Cookie', cookie);
  expect(csrf.status).toBe(200);
  const password = await request(app).post('/api/account/password').set('Cookie', cookie).set('X-CSRF-Token', RAW_CSRF).send({});
  expect(password.status).toBe(400);
  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie).set('X-CSRF-Token', RAW_CSRF);
  expect(logout.status).toBe(204);
});

test.each([
  ['get', '/API/account'],
  ['get', '/Api/account'],
  ['patch', '/API/account/profile'],
  ['get', '/aPi/support/accounts?type=STUDENT'],
  ['post', '/API/support/accounts/u1/status'],
  ['get', '/API/notifications/unread-count'],
  ['post', '/API/notifications/read-all'],
])('forced-change sessions cannot bypass R7 with %s %s', async (method, route) => {
  const response = await request(makeApp())[method](route).set('Cookie', cookie)
    .set('X-CSRF-Token', RAW_CSRF).send(method === 'patch'
      ? { name: 'Forbidden change' } : { accountStatus: 'INACTIVE' });
  expect(response.status).toBe(403);
  expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
});

test('case-insensitive password-change endpoint remains allowed', async () => {
  const response = await request(makeApp()).post('/API/account/password')
    .set('Cookie', cookie).set('X-CSRF-Token', RAW_CSRF).send({});
  expect(response.status).toBe(400);
  expect(response.body.code).toBeUndefined();
});
