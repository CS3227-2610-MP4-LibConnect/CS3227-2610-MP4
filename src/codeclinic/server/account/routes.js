const crypto = require('crypto');
const express = require('express');
const argon2 = require('argon2');
const { canonicalizeEmail } = require('../auth/email');
const REGISTRATION_EMAIL_FORMAT = /^[^\s@.]+(\.[^\s@.]+)*@[^\s@.]+(\.[^\s@.]+)+$/;
const { MAX_BODY_BYTES, MAX_PASSWORD_BYTES, isVersionedArgon2idHash } = require('../auth/login');
const { createAccountGuards } = require('./guards');

const NAME_BYTES = 200;
const EMAIL_BYTES = 254;
const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const INVALID = 'Enter valid account details.';
const RETRY = 'Account service is temporarily unavailable. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const ACCOUNT_ERRORS = Object.freeze({
  AUTHENTICATION_REQUIRED: 'Your session has expired. Please sign in again.',
  CURRENT_PASSWORD_INCORRECT: 'Your current password is incorrect. Please try again.',
  CURRENT_PASSWORD_REQUIRED: 'Enter your current password to change your email address.',
  PASSWORD_ATTEMPTS_EXCEEDED: 'Too many password attempts. Please try again later.',
  INVALID_NAME: `Enter a non-empty name within ${NAME_BYTES} UTF-8 bytes.`,
  INVALID_EMAIL: `Enter a valid email address within ${EMAIL_BYTES} UTF-8 bytes.`,
  EMAIL_UNAVAILABLE: 'This email is unavailable. Use a different email address.',
  INVALID_NEW_PASSWORD: `Use a password with at least 8 characters and no more than ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
  INVALID_REQUEST: INVALID,
});

function accountError(res, status, code, field) {
  return res.status(status).json({ code, ...(field ? { field } : {}), message: ACCOUNT_ERRORS[code] });
}
function isSelfAccountPath(path) {
  const normalized = typeof path === 'string' ? path.toLowerCase().replace(/\/+$/, '') : '';
  return normalized === '/account/profile' || normalized === '/account/password';
}

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function boundedText(value, maxBytes) { return typeof value === 'string' && value.trim().length > 0 && Buffer.byteLength(value.trim(), 'utf8') <= maxBytes; }
function validEmail(value) { if (typeof value !== 'string') return false; const e = value.trim(); return boundedText(e, EMAIL_BYTES) && REGISTRATION_EMAIL_FORMAT.test(e); }
function validPassword(value) { return typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES; }
function makeTemporaryPassword(randomInt = crypto.randomInt) {
  let result = '';
  for (let i = 0; i < 16; i += 1) result += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return result;
}
function validateProfile(body) {
  if (!isObject(body)) return null;
  const allowed = ['name', 'email', 'currentPassword'];
  if (!Object.keys(body).length || Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (body.name !== undefined && !boundedText(body.name, NAME_BYTES)) return null;
  if (body.email !== undefined && !validEmail(body.email)) return null;
  if (body.currentPassword !== undefined && (typeof body.currentPassword !== 'string' || Buffer.byteLength(body.currentPassword, 'utf8') > MAX_PASSWORD_BYTES)) return null;
  return { ...body, ...(body.name !== undefined ? { name: body.name.trim() } : {}), ...(body.email !== undefined ? { email: body.email.trim() } : {}) };
}
function validatePassword(body) {
  if (!isObject(body) || Object.keys(body).length !== 2 || !Object.hasOwn(body, 'currentPassword') || !Object.hasOwn(body, 'newPassword')) return null;
  if (typeof body.currentPassword !== 'string' || Buffer.byteLength(body.currentPassword, 'utf8') > MAX_PASSWORD_BYTES || !validPassword(body.newPassword)) return null;
  return body;
}
function profileValidationError(body) {
  if (!isObject(body) || !Object.keys(body).length || Object.keys(body).some((key) => !['name', 'email', 'currentPassword'].includes(key))) return null;
  const invalid = [];
  if (body.name !== undefined && !boundedText(body.name, NAME_BYTES)) invalid.push('name');
  if (body.email !== undefined && !validEmail(body.email)) invalid.push('email');
  if (body.currentPassword !== undefined && (typeof body.currentPassword !== 'string' || Buffer.byteLength(body.currentPassword, 'utf8') > MAX_PASSWORD_BYTES)) invalid.push('currentPassword');
  if (invalid.length === 1 && invalid[0] !== 'currentPassword') return invalid[0];
  return null;
}
function sendError(res, error) {
  if (error && error.code === 'INVALID') return res.status(400).json({ message: INVALID });
  if (error && error.code === 'NOT_FOUND') return res.status(404).json({ message: 'Account not found.' });
  if (error && error.code === 'ALREADY_EXISTS') return res.status(409).json({ message: 'Email is unavailable.' });
  return res.status(503).json({ message: RETRY });
}
function createAccountRouter({ accountStore, authStore, loginRepository, now = Date.now, passwordHash = (password) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }), randomInt = crypto.randomInt } = {}) {
  if (!accountStore || !authStore || !loginRepository) throw new TypeError('Account, auth, and login stores are required.');
  const router = express.Router();
  router.use(express.json({ limit: MAX_BODY_BYTES, strict: true }));
  const guards = createAccountGuards({ authStore, accountStore, now });
  const protectedRoute = [guards.requireActiveActor, guards.requireCsrf];

  router.get('/account', guards.requireActiveActor, async (req, res) => {
    try {
      const user = await accountStore.getAccount(req.actor.userId);
      if (!user) return res.status(401).json({ message: 'Authentication required.' });
      return res.json({ name: user.name, email: user.email, accountType: user.accountType, isManager: user.accountType === 'TA' && user.isManager === true });
    } catch { return res.status(503).json({ message: RETRY }); }
  });

  router.patch('/account/profile', ...protectedRoute, async (req, res) => {
    const input = validateProfile(req.body);
    if (!input) {
      const field = profileValidationError(req.body);
      if (field === 'currentPassword') return accountError(res, 400, 'CURRENT_PASSWORD_REQUIRED', field);
      if (field === 'name') return accountError(res, 400, 'INVALID_NAME', field);
      if (field === 'email') return accountError(res, 400, 'INVALID_EMAIL', field);
      return accountError(res, 400, 'INVALID_REQUEST');
    }
    try {
      const current = await accountStore.getAccount(req.actor.userId);
      if (!current) return accountError(res, 401, 'AUTHENTICATION_REQUIRED');
      if (input.email !== undefined) {
        if (canonicalizeEmail(input.email) !== current.canonicalEmailKey) {
          if (typeof input.currentPassword !== 'string') return accountError(res, 400, 'CURRENT_PASSWORD_REQUIRED', 'currentPassword');
          if (!await argon2.verify(current.passwordHash, input.currentPassword)) return accountError(res, 401, 'CURRENT_PASSWORD_INCORRECT', 'currentPassword');
        }
      }
      await accountStore.updateProfile(req.actor.userId, { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.email !== undefined ? { email: input.email } : {}) });
      const updated = await accountStore.getAccount(req.actor.userId);
      return res.json({ name: updated.name, email: updated.email, accountType: updated.accountType, isManager: updated.accountType === 'TA' && updated.isManager === true });
    } catch (error) {
      if (error && error.code === 'ALREADY_EXISTS') return accountError(res, 409, 'EMAIL_UNAVAILABLE', 'email');
      return sendError(res, error);
    }
  });

  router.post('/account/password', ...protectedRoute, async (req, res) => {
    const input = validatePassword(req.body);
    if (!input) {
      const validCurrent = isObject(req.body) && Object.hasOwn(req.body, 'currentPassword') && typeof req.body.currentPassword === 'string' && Buffer.byteLength(req.body.currentPassword, 'utf8') <= MAX_PASSWORD_BYTES;
      const validShape = isObject(req.body) && Object.keys(req.body).length === 2 && Object.hasOwn(req.body, 'currentPassword') && Object.hasOwn(req.body, 'newPassword');
      if (validShape && validCurrent) return accountError(res, 400, 'INVALID_NEW_PASSWORD', 'newPassword');
      return accountError(res, 400, 'INVALID_REQUEST');
    }
    let reserved = false;
    const user = await accountStore.getAccount(req.actor.userId).catch(() => null);
    if (!user) return res.status(503).json({ message: RETRY });
    let passwordMatched = false;
    try {
      const key = user.canonicalEmailKey;
      reserved = await authStore.reserveRateSlot('email', key, 5, now(), 15 * 60 * 1000);
      if (!reserved) return accountError(res, 401, 'PASSWORD_ATTEMPTS_EXCEEDED');
      let matches;
      try { matches = await argon2.verify(user.passwordHash, input.currentPassword); }
      catch (error) {
        await authStore.releaseRateSlot('email', key, now(), 15 * 60 * 1000);
        reserved = false;
        throw error;
      }
      if (!matches) return accountError(res, 401, 'CURRENT_PASSWORD_INCORRECT', 'currentPassword');
      passwordMatched = true;
      const hash = await passwordHash(input.newPassword);
      await accountStore.setPasswordHash(user.userId, hash, { mustChangePassword: false, keepSessionIdHash: req.actor.sessionIdHash });
      await authStore.releaseRateSlot('email', key, now(), 15 * 60 * 1000);
      reserved = false;
      return res.status(204).end();
    } catch (error) {
      if (reserved && passwordMatched) {
        try { await authStore.releaseRateSlot('email', user.canonicalEmailKey, now(), 15 * 60 * 1000); } catch { /* generic error below */ }
      }
      return sendError(res, error);
    }
  });

  router.get('/support/accounts', guards.requireActiveActor, guards.requireSupportListAccess, async (req, res) => {
    const pageSize = req.query.limit === undefined ? 50 : Number(req.query.limit);
    const cursor = req.query.cursor;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 || (cursor !== undefined && (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursor)))) return res.status(400).json({ message: INVALID });
    try { return res.json(await accountStore.listAccountsByType(req.supportListType, { pageSize, cursor })); }
    catch (error) { return sendError(res, error); }
  });

  router.post('/support/accounts/:userId/status', ...protectedRoute, guards.requireSupportTarget, async (req, res) => {
    if (!isObject(req.body) || Object.keys(req.body).length !== 1 || !['ACTIVE', 'INACTIVE'].includes(req.body.accountStatus)) return res.status(400).json({ message: INVALID });
    try { await accountStore.setAccountStatus(req.supportTarget.userId, req.body.accountStatus); return res.status(204).end(); }
    catch (error) { return sendError(res, error); }
  });

  router.post('/support/accounts/:userId/password-reset', ...protectedRoute, guards.requireSupportTarget, async (req, res) => {
    if (req.body !== undefined && (!isObject(req.body) || Object.keys(req.body).length)) return res.status(400).json({ message: INVALID });
    try {
      const temporaryPassword = makeTemporaryPassword(randomInt);
      const hash = await passwordHash(temporaryPassword);
      await accountStore.setPasswordHash(req.supportTarget.userId, hash, { mustChangePassword: true });
      res.set('Cache-Control', 'no-store');
      return res.json({ temporaryPassword });
    } catch (error) { return sendError(res, error); }
  });

  router.use((error, req, res, next) => {
    if (error && (error.type === 'entity.too.large' || error.type === 'entity.parse.failed' || error.status === 400)) {
      if (isSelfAccountPath(req.path)) return accountError(res, 400, 'INVALID_REQUEST');
      return res.status(400).json({ message: INVALID });
    }
    return res.status(503).json({ message: RETRY });
  });
  return router;
}

module.exports = { NAME_BYTES, EMAIL_BYTES, TEMP_ALPHABET, validateProfile, validatePassword, makeTemporaryPassword, createAccountRouter };
