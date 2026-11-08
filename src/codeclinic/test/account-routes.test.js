const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = global.setImmediate || ((callback, ...args) => setTimeout(callback, 0, ...args));
const request = require('supertest');
const argon2 = require('argon2');
const { createAccountRouter, makeTemporaryPassword, TEMP_ALPHABET } = require('../server/account/routes');
const { createForcedPasswordChangeGuard } = require('../server/auth/login');
const express = require('express');

const RAW = 's'.repeat(43);
const CSRF = 'c'.repeat(43);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

function makeHarness(userInput = {}) {
  const user = { userId: 'user-1', name: 'Ada', email: 'ada@example.edu', canonicalEmailKey: 'ada@example.edu', passwordHash: null, accountType: 'STUDENT', accountStatus: 'ACTIVE', ...userInput };
  const session = { userId: user.userId, accountTypeAtIssue: user.accountType, csrfTokenHash: hash(CSRF), issuedAt: Date.now(), lastSeenAt: Date.now(), expiresAt: Date.now() + 60000 };
  const authStore = {
    getSession: jest.fn(async () => session), touchSession: jest.fn(async () => true), deleteSession: jest.fn(),
    reserveRateSlot: jest.fn(async () => true), releaseRateSlot: jest.fn(async () => true),
  };
  const accountStore = {
    getAccount: jest.fn(async () => user),
    updateProfile: jest.fn(async (_id, changes) => Object.assign(user, changes)),
    setPasswordHash: jest.fn(async (_id, newHash, options) => { user.passwordHash = newHash; user.mustChangePassword = options.mustChangePassword; }),
    listAccountsByType: jest.fn(async () => ({ accounts: [], nextCursor: null })),
    setAccountStatus: jest.fn(async (_id, status) => { user.accountStatus = status; }),
  };
  const app = express();
  app.use('/api', createAccountRouter({ accountStore, authStore, loginRepository: {}, passwordHash: async (pw) => `hashed:${pw}` }));
  return { app, user, session, authStore, accountStore };
}

beforeAll(async () => {
  // Use a real Argon2id record for credential verification in route tests.
  global.__accountTestPasswordHash = await argon2.hash('correct horse battery', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
});

function auth(agent, token = CSRF) { return agent.set('Cookie', `__Host-codeclinic_session=${RAW}`).set('X-CSRF-Token', token); }

test('self account returns only profile fields plus own manager state', async () => {
  const { app, user } = makeHarness({ passwordHash: global.__accountTestPasswordHash, isManager: true, accountType: 'TA' });
  const response = await request(app).get('/api/account').set('Cookie', `__Host-codeclinic_session=${RAW}`);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ name: 'Ada', email: 'ada@example.edu', accountType: 'TA', isManager: true });
  expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  expect(user.passwordHash).toBeTruthy();
});

test('profile rejects forged fields, requires password for email change, and updates permitted fields', async () => {
  const { app, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  const agent = request(app);
  expect((await auth(agent.patch('/api/account/profile')).send({ name: 'Ada', isManager: true })).status).toBe(400);
  expect((await auth(agent.patch('/api/account/profile')).send({ email: 'new@example.edu' })).status).toBe(400);
  expect((await auth(agent.patch('/api/account/profile')).send({ name: '  Ada Lovelace  ' })).status).toBe(200);
  expect(accountStore.updateProfile).toHaveBeenCalledWith('user-1', { name: 'Ada Lovelace' });
});

test('password change counts bad current password and keeps the active session after success', async () => {
  const { app, accountStore, authStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  const agent = request(app);
  expect((await auth(agent.post('/api/account/password')).send({ currentPassword: 'wrong-password', newPassword: 'new secret password' })).status).toBe(401);
  expect(authStore.reserveRateSlot).toHaveBeenCalledWith('email', 'ada@example.edu', 5, expect.any(Number), 900000);
  expect(accountStore.setPasswordHash).not.toHaveBeenCalled();
  expect((await auth(agent.post('/api/account/password')).send({ currentPassword: 'correct horse battery', newPassword: 'new secret password' })).status).toBe(204);
  expect(accountStore.setPasswordHash).toHaveBeenCalledWith('user-1', 'hashed:new secret password', { mustChangePassword: false, keepSessionIdHash: hash(RAW) });
});

test('support list and target routes rely on stored actor and reject missing CSRF', async () => {
  const { app, user, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash, accountType: 'TA' });
  user.isManager = true;
  const agent = request(app);
  expect((await agent.get('/api/support/accounts?type=STUDENT').set('Cookie', `__Host-codeclinic_session=${RAW}`)).status).toBe(200);
  expect(accountStore.listAccountsByType).toHaveBeenCalledWith('STUDENT', { pageSize: 50, cursor: undefined });
  expect((await agent.post('/api/support/accounts/target/status').send({ accountStatus: 'INACTIVE' }).set('Cookie', `__Host-codeclinic_session=${RAW}`)).status).toBe(403);
});

test('temporary password uses exactly sixteen characters from the approved unambiguous alphabet', () => {
  expect(makeTemporaryPassword((max) => max - 1)).toBe(TEMP_ALPHABET.at(-1).repeat(16));
  expect(makeTemporaryPassword((max) => 0)).toBe(TEMP_ALPHABET[0].repeat(16));
  expect(TEMP_ALPHABET).not.toMatch(/[0OIl1]/);
});

test('forced-password middleware allows the R7 routes and blocks every other API path', async () => {
  const user = { userId: 'u', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true };
  const repository = { getUserById: async () => user };
  const session = { userId: 'u', accountTypeAtIssue: 'STUDENT' };
  const authStore = { getSession: async () => session, touchSession: async () => true, deleteSession: async () => {} };
  const app = express();
  app.use(createForcedPasswordChangeGuard(repository, authStore));
  app.get('/api/auth/session', (_req, res) => res.status(200).end());
  app.post('/api/account/password', (_req, res) => res.status(204).end());
  app.get('/api/notifications', (_req, res) => res.status(200).end());
  expect((await request(app).get('/api/auth/session').set('Cookie', `__Host-codeclinic_session=${RAW}`)).status).toBe(200);
  expect((await request(app).post('/api/account/password').set('Cookie', `__Host-codeclinic_session=${RAW}`)).status).toBe(204);
  const blocked = await request(app).get('/api/notifications').set('Cookie', `__Host-codeclinic_session=${RAW}`);
  expect(blocked.status).toBe(403);
  expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
});
