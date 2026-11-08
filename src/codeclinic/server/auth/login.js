const crypto = require('crypto');
const express = require('express');
const argon2 = require('argon2');
const { canonicalizeEmail, emailKeyFor } = require('./email');

const MAX_BODY_BYTES = 8 * 1024;
const MAX_EMAIL_BYTES = 254;
const MAX_PASSWORD_BYTES = 1024;
const GENERIC_DENIAL = 'Unable to sign in with those details.';
const RETRY_MESSAGE = 'Sign-in is temporarily unavailable. Please try again.';
const RATE_LIMIT_MESSAGE = 'Unable to sign in right now. Please try again later.';
const SESSION_COOKIE = '__Host-codeclinic_session';
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;

// A precomputed Argon2id hash used only for unknown or invalid account records.
// It contains no user data and is never returned or logged.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$MDEyMzQ1Njc4OWFiY2RlZg$9YWkgPbnBtCsQsBiGAJdRM2pfcLBgTIjg0QZVdkeeN0';

/** @typedef {'STUDENT'|'TA'} AccountType */
/** @typedef {{ email: string, password: string, accountType: AccountType }} LoginRequest */

function isBoundedUtf8(value, maxBytes) {
  return Buffer.byteLength(value, 'utf8') <= maxBytes;
}

/** @param {unknown} body @returns {LoginRequest|null} */
function validateLoginBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { email, password, accountType } = body;
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  if (!['STUDENT', 'TA'].includes(accountType)) return null;
  if (!email.trim() || !password.trim()) return null;
  if (!isBoundedUtf8(email, MAX_EMAIL_BYTES) || !isBoundedUtf8(password, MAX_PASSWORD_BYTES)) return null;
  return { email, password, accountType };
}

function isVersionedArgon2idHash(hash) {
  if (typeof hash !== 'string') return false;
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(hash);
  if (!match) return false;
  const [, memory, iterations, parallelism, salt, digest] = match;
  return Number(memory) >= 19456 && Number(iterations) >= 2 && Number(parallelism) === 1 &&
    salt.length >= 16 && digest.length >= 32;
}

function isValidAccountRecord(record, userId, canonicalEmail) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  // Records written before the Student/TA rename are malformed; there is no migration.
  if (Object.prototype.hasOwnProperty.call(record, 'memberId')) return false;
  return record.userId === userId &&
    typeof record.email === 'string' &&
    record.canonicalEmailKey === canonicalEmail &&
    record.email.trim().toLowerCase() === canonicalEmail &&
    isVersionedArgon2idHash(record.passwordHash) &&
    ['STUDENT', 'TA'].includes(record.accountType) &&
    ['ACTIVE', 'INACTIVE'].includes(record.accountStatus);
}

/**
 * @typedef {{ findEmailKeyMatches(key: string): Promise<unknown[]>, getUserById(userId: string): Promise<unknown> }} LoginRepository
 * @typedef {{ passwordMatched: boolean, userId?: string, accountType?: 'STUDENT'|'TA' }} PasswordVerificationResult
 * `passwordMatched` is credential evidence only. It does not authorize a login,
 * establish a session, or replace T04's account status and selected-type checks.
 */

/** @param {LoginRepository} repository @param {LoginRequest} input @returns {Promise<PasswordVerificationResult>} */
async function verifyCredentials(repository, input) {
  const canonicalEmail = canonicalizeEmail(input.email);
  const key = emailKeyFor(canonicalEmail);
  let userId;
  let records;
  try {
    records = await repository.findEmailKeyMatches(key);
  } catch (error) {
    throw error;
  }

  if (!Array.isArray(records) || records.length !== 1 || !records[0] || typeof records[0] !== 'object') {
    await argon2.verify(DUMMY_HASH, input.password);
    return { passwordMatched: false };
  }

  userId = records[0].userId;
  if (typeof userId !== 'string' || userId.length === 0 || userId.length > 128) {
    await argon2.verify(DUMMY_HASH, input.password);
    return { passwordMatched: false };
  }

  const record = await repository.getUserById(userId);
  if (!isValidAccountRecord(record, userId, canonicalEmail)) {
    await argon2.verify(DUMMY_HASH, input.password);
    return { passwordMatched: false };
  }

  let matched = false;
  try {
    matched = await argon2.verify(record.passwordHash, input.password);
  } catch (error) {
    return { passwordMatched: false };
  }
  if (!matched) return { passwordMatched: false };
  return { passwordMatched: true, userId, accountType: record.accountType };
}

function createFirestoreLoginRepository(db) {
  return {
    async findEmailKeyMatches(key) {
      const snapshot = await db.collection('emailKeys').doc(key).get();
      return snapshot.exists ? [snapshot.data()] : [];
    },
    async getUserById(userId) {
      const snapshot = await db.collection('users').doc(userId).get();
      return snapshot.exists ? snapshot.data() : null;
    },
  };
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

/** Session check shared by the auth routes and other authenticated routers. */
function createSessionAuthenticator(repository, authStore, now = Date.now) {
  return async function authenticateRequest(req, res) {
    const rawId = readCookie(req, SESSION_COOKIE);
    if (!rawId || !/^[A-Za-z0-9_-]{40,64}$/.test(rawId)) return null;
    const idHash = crypto.createHash('sha256').update(rawId, 'utf8').digest('hex');
    let session;
    try {
      session = await authStore.getSession(idHash);
      if (!session || typeof session.userId !== 'string' ||
          !['STUDENT', 'TA'].includes(session.accountTypeAtIssue)) return null;
      const user = await repository.getUserById(session.userId);
      if (!user || user.userId !== session.userId || user.accountStatus !== 'ACTIVE' ||
          user.accountType !== session.accountTypeAtIssue || !['STUDENT', 'TA'].includes(user.accountType)) {
        await authStore.deleteSession(idHash);
        return null;
      }
      // The store evaluates `now` after its transactional read, on every
      // transaction attempt, so an in-flight request cannot touch stale state.
      const touched = await authStore.touchSession(idHash, now);
      if (!touched) return null;
      const name = typeof user.name === 'string' ? user.name.trim() : '';
      return {
        idHash, session, accountType: user.accountType,
        name: name && Buffer.byteLength(name, 'utf8') <= 200 ? name : null,
      };
    } catch (error) {
      throw error;
    }
  };
}

/** Enforces the R7 endpoint allow-list for temporary-password sessions. */
function createForcedPasswordChangeGuard(repository, authStore, now = Date.now) {
  const authenticateRequest = createSessionAuthenticator(repository, authStore, now);
  const allowed = new Set([
    'GET /api/auth/session', 'GET /api/auth/csrf',
    'POST /api/auth/logout', 'POST /api/account/password',
  ]);
  return async function forcedPasswordChangeGuard(req, res, next) {
    // Express matches routes case-insensitively by default. Apply the same
    // semantics before deciding whether an API path needs the restriction.
    const apiPath = req.path.toLowerCase();
    if (!apiPath.startsWith('/api/')) return next();
    if (allowed.has(`${req.method} ${apiPath}`)) return next();
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return next();
      const user = await repository.getUserById(auth.session.userId);
      if (user && user.mustChangePassword === true) {
        return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      }
      return next();
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  };
}

/** SHA-256 hex of the submitted `X-CSRF-Token` header, or '' when absent. */
function hashSubmittedCsrf(req) {
  const supplied = req.get('X-CSRF-Token');
  return typeof supplied === 'string' ? crypto.createHash('sha256').update(supplied, 'utf8').digest('hex') : '';
}

function createLoginApp(repository, authStore, options = {}) {
  if (!repository || typeof repository.findEmailKeyMatches !== 'function' || typeof repository.getUserById !== 'function') {
    throw new TypeError('A login repository adapter is required.');
  }
  if (!authStore || typeof authStore.reserveRateSlot !== 'function' ||
      typeof authStore.releaseRateSlot !== 'function' || typeof authStore.createSession !== 'function' ||
      typeof authStore.getSession !== 'function' || typeof authStore.touchSession !== 'function' ||
      typeof authStore.rotateCsrfToken !== 'function' || typeof authStore.deleteSession !== 'function' ||
      typeof authStore.deleteSessionIfCsrfMatches !== 'function') {
    throw new TypeError('A durable authentication store adapter is required.');
  }
  const now = options.now || Date.now;
  const sessionId = options.sessionId || (() => crypto.randomBytes(32).toString('base64url'));
  const csrfToken = options.csrfToken || (() => crypto.randomBytes(32).toString('base64url'));

  function setSessionCookie(res, value, maxAgeSeconds = Math.floor(ABSOLUTE_TIMEOUT_MS / 1000)) {
    res.append('Set-Cookie', `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
  }

  function clearSessionCookie(res) {
    setSessionCookie(res, '', 0);
  }

  const authenticateRequest = createSessionAuthenticator(repository, authStore, now);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: MAX_BODY_BYTES, strict: true }));
  app.post('/api/auth/login', async (req, res) => {
    const input = validateLoginBody(req.body);
    if (!input) return res.status(400).json({ message: 'Enter a valid email, password, and account type.' });

    const canonicalEmail = canonicalizeEmail(input.email);
    const source = req.socket && typeof req.socket.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown';
    let emailReserved = false;
    let sourceReserved = false;
    try {
      emailReserved = await authStore.reserveRateSlot('email', canonicalEmail, 5, now(), RATE_WINDOW_MS);
      if (!emailReserved) return res.status(429).json({ message: RATE_LIMIT_MESSAGE });
      sourceReserved = await authStore.reserveRateSlot('source', source, 30, now(), RATE_WINDOW_MS);
      if (!sourceReserved) {
        await authStore.releaseRateSlot('email', canonicalEmail, now(), RATE_WINDOW_MS);
        emailReserved = false;
        return res.status(429).json({ message: RATE_LIMIT_MESSAGE });
      }

      const result = await verifyCredentials(repository, input);
      if (!result.passwordMatched || !result.userId || !result.accountType) {
        return res.status(401).json({ message: GENERIC_DENIAL });
      }
      const user = await repository.getUserById(result.userId);
      if (!user || user.userId !== result.userId || user.accountStatus !== 'ACTIVE' ||
          user.accountType !== result.accountType || user.accountType !== input.accountType) {
        return res.status(401).json({ message: GENERIC_DENIAL });
      }

      const current = now();
      const rawId = sessionId();
      const rawCsrf = csrfToken();
      if (typeof rawId !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(rawId) ||
          typeof rawCsrf !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(rawCsrf)) {
        throw new Error('Secure token generation failed.');
      }
      const hashedId = crypto.createHash('sha256').update(rawId, 'utf8').digest('hex');
      const csrfTokenHash = crypto.createHash('sha256').update(rawCsrf, 'utf8').digest('hex');
      const expiresAt = current + ABSOLUTE_TIMEOUT_MS;
      await authStore.releaseRateSlot('email', canonicalEmail, current, RATE_WINDOW_MS);
      emailReserved = false;
      await authStore.releaseRateSlot('source', source, current, RATE_WINDOW_MS);
      sourceReserved = false;
      await authStore.createSession(hashedId, {
        userId: result.userId,
        accountTypeAtIssue: user.accountType,
        issuedAt: current,
        lastSeenAt: current,
        expiresAt,
        csrfTokenHash,
      });

      setSessionCookie(res, rawId);
      return res.status(200).json({ accountType: user.accountType });
    } catch (error) {
      try {
        if (emailReserved) await authStore.releaseRateSlot('email', canonicalEmail, now(), RATE_WINDOW_MS);
        if (sourceReserved) await authStore.releaseRateSlot('source', source, now(), RATE_WINDOW_MS);
      } catch (releaseError) { /* generic 503; never log authentication data */ }
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) {
        clearSessionCookie(res);
        return res.status(401).json({ message: 'Authentication required.' });
      }
      return res.status(200).json({
        accountType: auth.accountType,
        ...((await repository.getUserById(auth.session.userId)).mustChangePassword === true
          ? { mustChangePassword: true } : {}),
        ...(auth.accountType === 'STUDENT' && auth.name ? { name: auth.name } : {}),
      });
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  app.get('/api/auth/csrf', async (req, res) => {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return res.status(401).json({ message: 'Authentication required.' });
      const token = csrfToken();
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) throw new Error('Secure token generation failed.');
      const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
      await authStore.rotateCsrfToken(auth.idHash, tokenHash);
      return res.status(200).json({ csrfToken: token });
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) {
        clearSessionCookie(res);
        return res.status(401).json({ message: 'Authentication required.' });
      }
      const suppliedHash = hashSubmittedCsrf(req);
      const deleted = await authStore.deleteSessionIfCsrfMatches(auth.idHash, suppliedHash);
      if (!deleted) return res.status(403).json({ message: 'Request could not be verified.' });
      clearSessionCookie(res);
      return res.status(204).end();
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  app.use(createForcedPasswordChangeGuard(repository, authStore, now));

  app.use((error, req, res, next) => {
    if (error && (error.type === 'entity.too.large' || error.type === 'entity.parse.failed' || error.status === 400)) {
      return res.status(400).json({ message: 'Enter a valid email, password, and account type.' });
    }
    return res.status(503).json({ message: RETRY_MESSAGE });
  });
  return app;
}

module.exports = {
  MAX_BODY_BYTES,
  MAX_EMAIL_BYTES,
  MAX_PASSWORD_BYTES,
  GENERIC_DENIAL,
  RETRY_MESSAGE,
  SESSION_COOKIE,
  canonicalizeEmail,
  emailKeyFor,
  validateLoginBody,
  isVersionedArgon2idHash,
  verifyCredentials,
  createFirestoreLoginRepository,
  createLoginApp,
  createSessionAuthenticator,
  createForcedPasswordChangeGuard,
  hashSubmittedCsrf,
};
