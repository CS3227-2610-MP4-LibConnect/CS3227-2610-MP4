const crypto = require('crypto');
const { SESSION_COOKIE, createSessionAuthenticator, hashSubmittedCsrf } = require('../auth/login');

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ACCOUNT_TYPES = ['STUDENT', 'TA'];

const AUTH_REQUIRED = 'Authentication required.';
const NOT_VERIFIED = 'Request could not be verified.';
const FORBIDDEN = 'You do not have permission to do that.';
const NOT_FOUND = 'Account not found.';
const INVALID = 'Enter valid details.';
const RETRY = 'Account service is temporarily unavailable. Please try again.';
const ACCOUNT_AUTH = 'Your session has expired. Please sign in again.';

function isSelfAccountPath(req) {
  const path = typeof req.path === 'string' ? req.path.toLowerCase().replace(/\/+$/, '') : '';
  return ['/account', '/account/profile', '/account/password'].includes(path);
}

function hashesMatch(a, b) {
  return typeof a === 'string' && typeof b === 'string' && HASH_PATTERN.test(a) && HASH_PATTERN.test(b) &&
    crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** A TA lists Students; only a TA Coordinator also lists TAs (R1, R4). */
function canListAccountType(actor, accountType) {
  if (!actor || actor.accountType !== 'TA') return false;
  if (accountType === 'STUDENT') return true;
  return accountType === 'TA' && actor.isManager === true;
}

/** R4 matrix over the stored target record; never over request fields. */
function canActOnTarget(actor, target) {
  if (!actor || !target || actor.accountType !== 'TA') return false;
  if (target.accountType === 'STUDENT') return true;
  return target.accountType === 'TA' && actor.isManager === true && target.userId !== actor.userId;
}

/**
 * Express middleware for account and support routes. The actor is derived
 * only from the server session and the stored account record, and is
 * exposed as `req.actor`; client-supplied role, manager, or ID fields are ignored.
 */
function createAccountGuards({ authStore, accountStore, now = Date.now } = {}) {
  if (!authStore || typeof authStore.getSession !== 'function' ||
      typeof authStore.touchSession !== 'function' || typeof authStore.deleteSession !== 'function') {
    throw new TypeError('A durable authentication store adapter is required.');
  }
  if (!accountStore || typeof accountStore.getAccount !== 'function') {
    throw new TypeError('An account store is required.');
  }
  const authenticateRequest = createSessionAuthenticator(
    { getUserById: (userId) => accountStore.getAccount(userId) }, authStore, now);
  const sessionHashes = new WeakMap();

  function clearSessionCookie(res) {
    res.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  }

  function unauthenticated(res) {
    clearSessionCookie(res);
    return res.status(401).json({ message: AUTH_REQUIRED });
  }

  function unauthenticatedRequest(req, res) {
    clearSessionCookie(res);
    return isSelfAccountPath(req)
      ? res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', message: ACCOUNT_AUTH })
      : res.status(401).json({ message: AUTH_REQUIRED });
  }

  async function requireActiveActor(req, res, next) {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return unauthenticatedRequest(req, res);
      const { idHash, session } = auth;
      // Reload for fields the shared check does not return (`isManager`, `mustChangePassword`).
      const user = await accountStore.getAccount(session.userId);
      if (!user || user.userId !== session.userId || user.accountStatus !== 'ACTIVE' ||
          user.accountType !== auth.accountType) return unauthenticatedRequest(req, res);
      req.actor = Object.freeze({
        userId: user.userId,
        accountType: user.accountType,
        isManager: user.accountType === 'TA' && user.isManager === true,
        mustChangePassword: user.mustChangePassword === true,
        sessionIdHash: idHash,
      });
      sessionHashes.set(req, idHash);
      return next();
    } catch (error) {
      return res.status(503).json({ message: RETRY });
    }
  }

  async function requireCsrf(req, res, next) {
    if (SAFE_METHODS.includes(req.method)) return next();
    const idHash = sessionHashes.get(req);
    if (!idHash || !req.actor) return unauthenticatedRequest(req, res);
    try {
      const suppliedHash = hashSubmittedCsrf(req);
      if (!suppliedHash) return res.status(403).json({ message: NOT_VERIFIED });
      const session = await authStore.getSession(idHash);
      if (!session || session.userId !== req.actor.userId) return unauthenticatedRequest(req, res);
      if (!hashesMatch(suppliedHash, session.csrfTokenHash)) {
        return res.status(403).json({ message: NOT_VERIFIED });
      }
      return next();
    } catch (error) {
      return res.status(503).json({ message: RETRY });
    }
  }

  /** Validates `?type=` and sets `req.supportListType`. */
  function requireSupportListAccess(req, res, next) {
    if (!req.actor) return unauthenticated(res);
    if (req.actor.accountType !== 'TA') return res.status(403).json({ message: FORBIDDEN });
    const type = req.query ? req.query.type : undefined;
    if (!ACCOUNT_TYPES.includes(type)) return res.status(400).json({ message: INVALID });
    if (!canListAccountType(req.actor, type)) return res.status(403).json({ message: FORBIDDEN });
    req.supportListType = type;
    return next();
  }

  /** Loads `:userId` server-side, applies R4, and sets `req.supportTarget`. */
  async function requireSupportTarget(req, res, next) {
    if (!req.actor) return unauthenticated(res);
    if (req.actor.accountType !== 'TA') return res.status(403).json({ message: FORBIDDEN });
    const userId = req.params ? req.params.userId : undefined;
    if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
      return res.status(400).json({ message: INVALID });
    }
    try {
      const target = await accountStore.getAccount(userId);
      if (!target || target.userId !== userId) return res.status(404).json({ message: NOT_FOUND });
      if (!canActOnTarget(req.actor, target)) return res.status(403).json({ message: FORBIDDEN });
      req.supportTarget = Object.freeze({
        userId: target.userId,
        accountType: target.accountType,
        accountStatus: target.accountStatus,
      });
      return next();
    } catch (error) {
      return res.status(503).json({ message: RETRY });
    }
  }

  return { requireActiveActor, requireCsrf, requireSupportListAccess, requireSupportTarget };
}

module.exports = {
  SESSION_COOKIE,
  MESSAGES: Object.freeze({ AUTH_REQUIRED, NOT_VERIFIED, FORBIDDEN, NOT_FOUND, INVALID, RETRY }),
  canListAccountType,
  canActOnTarget,
  createAccountGuards,
};
