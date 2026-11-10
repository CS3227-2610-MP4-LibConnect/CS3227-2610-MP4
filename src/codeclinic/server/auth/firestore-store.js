const crypto = require('crypto');
const { createFirestoreRateCounter } = require('../shared/firestore-rate-counter');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
// Skip rewriting last-seen when it is this recent. Concurrent requests from one
// page would otherwise contend on the same session document for seconds. The
// stored time can lag real activity by at most this much, so an idle session
// may end up to this much early, never late.
const TOUCH_INTERVAL_MS = 60 * 1000;

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

  const counter = createFirestoreRateCounter(db, {
    collection: 'loginFailureCounters',
    countField: 'failureCount',
  });

  return {
    async reserveRateSlot(kind, identifier, limit, now, windowMs) {
      return counter.reserve(kind, identifier, limit, now, windowMs);
    },

    async releaseRateSlot(kind, identifier, now, windowMs) {
      return counter.release(kind, identifier, now, windowMs);
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
      const readClock = () => (typeof operationClock === 'function' ? operationClock() : operationClock);

      // Fast path: a plain read is enough when the session is valid and was
      // touched recently. Anything else falls through to the transaction,
      // which re-reads current state, refreshes, or deletes the session.
      const snapshot = await ref.get();
      if (!snapshot.exists) return false;
      const stored = snapshot.data();
      const storedIssuedAt = millis(stored.issuedAt);
      const storedLastSeenAt = millis(stored.lastSeenAt);
      const storedExpiry = millis(stored.expiresAt);
      const readAt = readClock();
      if (!Number.isFinite(readAt) || !Number.isFinite(storedIssuedAt) ||
          !Number.isFinite(storedLastSeenAt) || !Number.isFinite(storedExpiry) ||
          readAt < storedLastSeenAt) return false;
      if (readAt - storedLastSeenAt < TOUCH_INTERVAL_MS &&
          readAt - storedIssuedAt < ABSOLUTE_TIMEOUT_MS && readAt < storedExpiry) return true;

      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const data = snapshot.data();
        const issuedAt = millis(data.issuedAt);
        const previousLastSeenAt = millis(data.lastSeenAt);
        const storedExpiresAt = millis(data.expiresAt);
        // Read the clock inside the callback so every Firestore retry gets a
        // fresh operation time, after the transaction has read current state.
        const current = readClock();
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

    /**
     * Deletes every session of `userId`, optionally keeping `exceptIdHash`.
     * With `transaction`, the session read and deletes join that transaction;
     * the caller must finish its other reads first and commit the transaction.
     */
    async deleteSessionsForUser(userId, { exceptIdHash, transaction } = {}) {
      if (typeof userId !== 'string' || userId.length === 0 || userId.length > 128) {
        throw new TypeError('A user ID is required.');
      }
      const query = db.collection('loginSessions').where('userId', '==', userId);
      const run = async (tx) => {
        const snapshot = await tx.get(query);
        let deleted = 0;
        for (const doc of snapshot.docs) {
          if (exceptIdHash && doc.id === exceptIdHash) continue;
          tx.delete(doc.ref);
          deleted += 1;
        }
        return deleted;
      };
      return transaction ? run(transaction) : db.runTransaction(run);
    },
  };
}

module.exports = { createFirestoreAuthStore };
