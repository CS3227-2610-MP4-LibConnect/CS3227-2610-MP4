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

test('self-service missing sessions have an explicit safe code while support responses stay compatible', async () => {
  const { app } = makeHarness();
  const account = await request(app).get('/api/account');
  expect(account.status).toBe(401);
  expect(account.body).toEqual({ code: 'AUTHENTICATION_REQUIRED', message: 'Your session has expired. Please sign in again.' });
  const support = await request(app).get('/api/support/accounts?type=STUDENT');
  expect(support.status).toBe(401);
  expect(support.body.code).toBeUndefined();
});

test('profile rejects forged fields, requires password for email change, and updates permitted fields', async () => {
  const { app, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  const agent = request(app);
  expect((await auth(agent.patch('/api/account/profile')).send({ name: 'Ada', isManager: true })).status).toBe(400);
  const missingPassword = await auth(agent.patch('/api/account/profile')).send({ email: 'new@example.edu' });
  expect(missingPassword.status).toBe(400);
  expect(missingPassword.body).toMatchObject({ code: 'CURRENT_PASSWORD_REQUIRED', field: 'currentPassword' });
  expect(missingPassword.body.message).toBe('Enter your current password to change your email address.');
  expect(accountStore.updateProfile).not.toHaveBeenCalled();
  expect((await auth(agent.patch('/api/account/profile')).send({ name: '  Ada Lovelace  ' })).status).toBe(200);
  expect(accountStore.updateProfile).toHaveBeenCalledWith('user-1', { name: 'Ada Lovelace' });
});

test('profile validation identifies only reliable name/email fields and preserves UTF-8 byte limits', async () => {
  const { app, accountStore } = makeHarness();
  const agent = request(app);
  const invalidName = await auth(agent.patch('/api/account/profile')).send({ name: '   ' });
  expect(invalidName).toMatchObject({ status: 400, body: { code: 'INVALID_NAME', field: 'name' } });
  const tooLongName = await auth(agent.patch('/api/account/profile')).send({ name: 'é'.repeat(101) });
  expect(tooLongName.body).toMatchObject({ code: 'INVALID_NAME', field: 'name' });
  const invalidEmail = await auth(agent.patch('/api/account/profile')).send({ email: 'not-an-email' });
  expect(invalidEmail.body).toMatchObject({ code: 'INVALID_EMAIL', field: 'email' });
  const numericEmail = await auth(agent.patch('/api/account/profile')).send({ email: 42 });
  expect(numericEmail.status).toBe(400);
  expect(numericEmail.body).toMatchObject({ code: 'INVALID_EMAIL', field: 'email' });
  const nullEmail = await auth(agent.patch('/api/account/profile')).send({ email: null });
  expect(nullEmail.status).toBe(400);
  expect(nullEmail.body).toMatchObject({ code: 'INVALID_EMAIL', field: 'email' });
  const oversizedEmail = await auth(agent.patch('/api/account/profile')).send({ email: `${'a'.repeat(243)}@example.edu` });
  expect(oversizedEmail.body).toMatchObject({ code: 'INVALID_EMAIL', field: 'email' });
  const ambiguous = await auth(agent.patch('/api/account/profile')).send({ name: '', email: 'bad' });
  expect(ambiguous.body).toMatchObject({ code: 'INVALID_REQUEST' });
  expect(ambiguous.body.field).toBeUndefined();
  expect(JSON.stringify([invalidName.body, tooLongName.body, invalidEmail.body, numericEmail.body, nullEmail.body, oversizedEmail.body, ambiguous.body])).not.toContain('not-an-email');
  expect(accountStore.updateProfile).not.toHaveBeenCalled();
});

test('unavailable email returns a safe email-specific conflict without echoing input', async () => {
  const { app, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  accountStore.updateProfile.mockRejectedValue(Object.assign(new Error('private store detail'), { code: 'ALREADY_EXISTS' }));
  const response = await auth(request(app).patch('/api/account/profile')).send({ email: 'taken@example.edu', currentPassword: 'correct horse battery' });
  expect(response.status).toBe(409);
  expect(response.body).toEqual({ code: 'EMAIL_UNAVAILABLE', field: 'email', message: 'This email is unavailable. Use a different email address.' });
  expect(JSON.stringify(response.body)).not.toContain('taken@example.edu');
});

test('a completed incorrect password comparison returns the mismatch code without a write', async () => {
  const { app, authStore, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  const agent = request(app);
  const mismatch = await auth(agent.post('/api/account/password')).send({ currentPassword: 'not the password', newPassword: 'new secret password' });
  expect(mismatch.status).toBe(401);
  expect(mismatch.body).toMatchObject({ code: 'CURRENT_PASSWORD_INCORRECT', field: 'currentPassword' });
  expect(mismatch.body.message).toBe('Your current password is incorrect. Please try again.');
  expect(accountStore.setPasswordHash).not.toHaveBeenCalled();
  expect(authStore.reserveRateSlot).toHaveBeenCalledTimes(1);
});

test('password attempt exhaustion is not reported as a completed mismatch', async () => {
  const { app, authStore, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  authStore.reserveRateSlot.mockResolvedValue(false);
  const exhausted = await auth(request(app).post('/api/account/password')).send({ currentPassword: 'not the password', newPassword: 'new secret password' });
  expect(exhausted.status).toBe(401);
  expect(exhausted.body).toMatchObject({ code: 'PASSWORD_ATTEMPTS_EXCEEDED' });
  expect(exhausted.body.message).toBe('Too many password attempts. Please try again later.');
  expect(exhausted.body.code).not.toBe('CURRENT_PASSWORD_INCORRECT');
  expect(authStore.reserveRateSlot).toHaveBeenCalledTimes(1);
  expect(accountStore.setPasswordHash).not.toHaveBeenCalled();
});

test('invalid new passwords describe existing character and UTF-8 byte limits; malformed shapes stay general', async () => {
  const { app, accountStore } = makeHarness({ passwordHash: global.__accountTestPasswordHash });
  const agent = request(app);
  const tooShort = await auth(agent.post('/api/account/password')).send({ currentPassword: 'correct horse battery', newPassword: 'short' });
  expect(tooShort.status).toBe(400);
  expect(tooShort.body).toMatchObject({ code: 'INVALID_NEW_PASSWORD', field: 'newPassword' });
  expect(tooShort.body.message).toContain('at least 8 characters');
  expect(tooShort.body.message).toContain('1024 UTF-8 bytes');
  const tooManyBytes = await auth(agent.post('/api/account/password')).send({ currentPassword: 'correct horse battery', newPassword: 'é'.repeat(513) });
  expect(tooManyBytes.body).toMatchObject({ code: 'INVALID_NEW_PASSWORD', field: 'newPassword' });
  const unknownField = await auth(agent.post('/api/account/password')).send({ currentPassword: 'x', newPassword: 'a sufficiently long value', role: 'TA' });
  expect(unknownField.body).toMatchObject({ code: 'INVALID_REQUEST' });
  expect(unknownField.body.field).toBeUndefined();
  const invalidCurrent = await auth(agent.post('/api/account/password')).send({ currentPassword: null, newPassword: 'a sufficiently long value' });
  expect(invalidCurrent.body).toMatchObject({ code: 'INVALID_REQUEST' });
  expect(accountStore.setPasswordHash).not.toHaveBeenCalled();
});

test('malformed JSON and oversized profile bodies retain a general safe validation response', async () => {
  const { app } = makeHarness();
  const malformed = await request(app).patch('/api/account/profile').set('Cookie', `__Host-codeclinic_session=${RAW}`).set('X-CSRF-Token', CSRF).set('Content-Type', 'application/json').send('{');
  expect(malformed.status).toBe(400);
  expect(malformed.body).toMatchObject({ code: 'INVALID_REQUEST', message: 'Enter valid account details.' });
  const oversized = await request(app).patch('/api/account/profile').set('Cookie', `__Host-codeclinic_session=${RAW}`).set('X-CSRF-Token', CSRF).send({ name: 'x'.repeat(9000) });
  expect(oversized.status).toBe(400);
  expect(oversized.body).toMatchObject({ code: 'INVALID_REQUEST' });
  expect(oversized.body.field).toBeUndefined();
});

test('case-insensitive and trailing-slash account aliases retain field feedback', async () => {
  const { app } = makeHarness();
  const response = await auth(request(app).patch('/API/ACCOUNT/PROFILE/')).send({ name: '' });
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({ code: 'INVALID_NAME', field: 'name' });
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
