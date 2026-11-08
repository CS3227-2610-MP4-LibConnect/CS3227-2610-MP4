const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function millis(value) {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return NaN;
}

/**
 * Transactional fixed-window counter shared across server instances.
 *
 * Documents live in `collection`, keyed by sha256(`${kind}:${identifier}`), so
 * raw identifiers are never stored as document IDs. Each document holds
 * `kind`, `windowStart`, the count (field name `countField`), and `expiresAt`.
 */
function createFirestoreRateCounter(db, { collection, countField = 'count' } = {}) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    throw new TypeError('A Firestore-compatible durable store is required.');
  }
  if (typeof collection !== 'string' || collection.length === 0) {
    throw new TypeError('A counter collection name is required.');
  }
  if (typeof countField !== 'string' || countField.length === 0) {
    throw new TypeError('A counter field name is required.');
  }

  function counterRef(kind, identifier) {
    const key = sha256(`${kind}:${identifier}`);
    return db.collection(collection).doc(key);
  }

  return {
    /** Reserves one slot; resolves true when reserved, false when the limit is reached. */
    async reserve(kind, identifier, limit, now, windowMs) {
      const ref = counterRef(kind, identifier);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.exists ? snapshot.data() : null;
        const started = data && millis(data.windowStart);
        const active = data && Number.isFinite(started) && now < started + windowMs;
        const count = active && Number.isInteger(data[countField]) ? data[countField] : 0;
        if (count >= limit) return false;
        const windowStart = active ? started : now;
        transaction.set(ref, {
          kind,
          windowStart: new Date(windowStart),
          [countField]: count + 1,
          expiresAt: new Date(windowStart + windowMs),
        });
        return true;
      });
    },

    /** Releases one slot in the current window; no-op when the window has ended. */
    async release(kind, identifier, now, windowMs) {
      const ref = counterRef(kind, identifier);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return;
        const data = snapshot.data();
        const started = millis(data.windowStart);
        if (!Number.isFinite(started) || now >= started + windowMs) return;
        const nextCount = Math.max(0, Number.isInteger(data[countField]) ? data[countField] - 1 : 0);
        if (nextCount === 0) transaction.delete(ref);
        else transaction.update(ref, { [countField]: nextCount });
      });
    },
  };
}

module.exports = { createFirestoreRateCounter };
