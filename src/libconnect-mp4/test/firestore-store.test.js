const crypto = require('crypto');
const { createFirestoreAuthStore } = require('../server/auth/firestore-store');

function clone(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function makeDb(initial = {}) {
  const documents = new Map(Object.entries(initial).map(([key, value]) => [key, clone(value)]));
  let transactionTail = Promise.resolve();
  let retryMutation = null;
  const refs = new Map();
  function refFor(collection, id) {
    const key = `${collection}/${id}`;
    if (!refs.has(key)) refs.set(key, { key });
    return refs.get(key);
  }
  return {
    documents,
    setRetryMutation(mutation) { retryMutation = mutation; },
    collection(name) {
      return { doc(id) { return refFor(name, id); } };
    },
    async runTransaction(callback) {
      const previous = transactionTail;
      let release;
      transactionTail = new Promise((resolve) => { release = resolve; });
      await previous;
      try {
        const runAttempt = async () => {
          const writes = [];
          const transaction = {
            async get(ref) {
              const value = documents.get(ref.key);
              return { exists: value !== undefined, data: () => clone(value) };
            },
            update(ref, value) { writes.push(() => documents.set(ref.key, { ...documents.get(ref.key), ...clone(value) })); },
            set(ref, value) { writes.push(() => documents.set(ref.key, clone(value))); },
            delete(ref) { writes.push(() => documents.delete(ref.key)); },
          };
          const result = await callback(transaction);
          return { result, writes };
        };
        const first = await runAttempt();
        if (retryMutation) {
          const mutation = retryMutation;
          retryMutation = null;
          mutation(documents);
          const retried = await runAttempt();
          retried.writes.forEach((write) => write());
          return retried.result;
        }
        first.writes.forEach((write) => write());
        return first.result;
      } finally {
        release();
      }
    },
  };
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('Firestore auth-store transaction safeguards', () => {
  test('rechecks idle expiry with a fresh clock value on transaction retry', async () => {
    const id = 'a'.repeat(64);
    const issuedAt = 1_800_000_000_000;
    const db = makeDb({ [`loginSessions/${id}`]: {
      userId: 'synthetic-user', accountTypeAtIssue: 'MEMBER',
      issuedAt: new Date(issuedAt), lastSeenAt: new Date(issuedAt),
      expiresAt: new Date(issuedAt + 30 * 60 * 1000), csrfTokenHash: hash('old'),
    } });
    db.setRetryMutation(() => {});
    const store = createFirestoreAuthStore(db);
    let readings = 0;
    const result = await store.touchSession(id, () => {
      readings += 1;
      return issuedAt + (readings === 1 ? 1 : 30 * 60 * 1000);
    });
    expect(result).toBe(false);
    expect(readings).toBe(2);
    expect(db.documents.has(`loginSessions/${id}`)).toBe(false);
  });

  test('does not move last-seen time backward when the operation clock rolls back', async () => {
    const id = 'b'.repeat(64);
    const issuedAt = 1_800_000_000_000;
    const lastSeenAt = issuedAt + 10_000;
    const db = makeDb({ [`loginSessions/${id}`]: {
      userId: 'synthetic-user', accountTypeAtIssue: 'MEMBER', issuedAt: new Date(issuedAt),
      lastSeenAt: new Date(lastSeenAt), expiresAt: new Date(issuedAt + 8 * 60 * 60 * 1000), csrfTokenHash: hash('token'),
    } });
    const store = createFirestoreAuthStore(db);
    expect(await store.touchSession(id, () => lastSeenAt - 1)).toBe(false);
    expect(db.documents.get(`loginSessions/${id}`).lastSeenAt.getTime()).toBe(lastSeenAt);
  });

  test('linearizes concurrent CSRF rotation and logout against the current stored hash', async () => {
    const id = 'c'.repeat(64);
    const oldHash = hash('old-token');
    const newHash = hash('new-token');
    const db = makeDb({ [`loginSessions/${id}`]: { csrfTokenHash: oldHash } });
    const store = createFirestoreAuthStore(db);
    const results = await Promise.allSettled([
      store.rotateCsrfToken(id, newHash),
      store.deleteSessionIfCsrfMatches(id, oldHash),
    ]);
    const deleteResult = results[1];
    const remaining = db.documents.get(`loginSessions/${id}`);
    if (deleteResult.status === 'fulfilled' && deleteResult.value === true) {
      expect(remaining).toBeUndefined();
    } else {
      expect(deleteResult.status).toBe('fulfilled');
      expect(deleteResult.value).toBe(false);
      expect(remaining.csrfTokenHash).toBe(newHash);
      expect(await store.deleteSessionIfCsrfMatches(id, oldHash)).toBe(false);
      expect(db.documents.get(`loginSessions/${id}`).csrfTokenHash).toBe(newHash);
      expect(await store.deleteSessionIfCsrfMatches(id, newHash)).toBe(true);
    }
  });
});
