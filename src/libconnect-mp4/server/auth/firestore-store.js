const crypto = require('crypto');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function millis(value) {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return NaN;
}

/** Firestore-backed durable session and shared failure-counter adapter. */
function createFirestoreAuthStore(db) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    throw new TypeError('A Firestore-compatible durable store is required.');
  }

  function sessionRef(idHash) {
    return db.collection('loginSessions').doc(idHash);
  }

  function counterRef(kind, identifier) {
    const key = sha256(`${kind}:${identifier}`);
    return db.collection('loginFailureCounters').doc(key);
  }

  return {
    async reserveRateSlot(kind, identifier, limit, now, windowMs) {
      const ref = counterRef(kind, identifier);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.exists ? snapshot.data() : null;
        const started = data && millis(data.windowStart);
        const active = data && Number.isFinite(started) && now < started + windowMs;
        const count = active && Number.isInteger(data.failureCount) ? data.failureCount : 0;
        if (count >= limit) return false;
        const windowStart = active ? started : now;
        transaction.set(ref, {
          kind,
          windowStart: new Date(windowStart),
          failureCount: count + 1,
          expiresAt: new Date(windowStart + windowMs),
        });
        return true;
      });
    },

    async releaseRateSlot(kind, identifier, now, windowMs) {
      const ref = counterRef(kind, identifier);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return;
        const data = snapshot.data();
        const started = millis(data.windowStart);
        if (!Number.isFinite(started) || now >= started + windowMs) return;
        const nextCount = Math.max(0, Number.isInteger(data.failureCount) ? data.failureCount - 1 : 0);
        if (nextCount === 0) transaction.delete(ref);
        else transaction.update(ref, { failureCount: nextCount });
      });
    },

    async createSession(idHash, record) {
      await sessionRef(idHash).create({
        userId: record.userId,
        accountTypeAtIssue: record.accountTypeAtIssue,
        issuedAt: new Date(record.issuedAt),
        lastSeenAt: new Date(record.lastSeenAt),
        expiresAt: new Date(record.expiresAt),
        csrfTokenHash: record.csrfTokenHash,
      });
    },

    async getSession(idHash) {
      const snapshot = await sessionRef(idHash).get();
      return snapshot.exists ? snapshot.data() : null;
    },

    async touchSession(idHash, operationClock = Date.now) {
      const ref = sessionRef(idHash);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const data = snapshot.data();
        const issuedAt = millis(data.issuedAt);
        const previousLastSeenAt = millis(data.lastSeenAt);
        const storedExpiresAt = millis(data.expiresAt);
        // Read the clock inside the callback so every Firestore retry gets a
        // fresh operation time, after the transaction has read current state.
        const current = typeof operationClock === 'function' ? operationClock() : operationClock;
        if (!Number.isFinite(current) || !Number.isFinite(issuedAt) ||
            !Number.isFinite(previousLastSeenAt) || !Number.isFinite(storedExpiresAt) ||
            current < previousLastSeenAt) return false;
        if (current - previousLastSeenAt >= IDLE_TIMEOUT_MS ||
            current - issuedAt >= ABSOLUTE_TIMEOUT_MS || current >= storedExpiresAt) {
          transaction.delete(ref);
          return false;
        }
        const expiresAt = Math.min(issuedAt + ABSOLUTE_TIMEOUT_MS, current + IDLE_TIMEOUT_MS);
        transaction.update(ref, { lastSeenAt: new Date(current), expiresAt: new Date(expiresAt) });
        return true;
      });
    },

    async rotateCsrfToken(idHash, csrfTokenHash) {
      const ref = sessionRef(idHash);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) throw new Error('Session is unavailable.');
        transaction.update(ref, { csrfTokenHash });
      });
    },

    async deleteSession(idHash) {
      await sessionRef(idHash).delete();
    },

    async deleteSessionIfCsrfMatches(idHash, submittedHash) {
      const ref = sessionRef(idHash);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const currentHash = snapshot.data().csrfTokenHash;
        if (typeof currentHash !== 'string' || !/^[a-f0-9]{64}$/.test(submittedHash) ||
            !/^[a-f0-9]{64}$/.test(currentHash)) return false;
        const matches = crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(currentHash, 'hex'));
        if (!matches) return false;
        transaction.delete(ref);
        return true;
      });
    },
  };
}

module.exports = { createFirestoreAuthStore };
