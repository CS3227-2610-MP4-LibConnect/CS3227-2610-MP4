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
  let transactions = 0;
  const refs = new Map();
  function refFor(collection, id) {
    const key = `${collection}/${id}`;
    if (!refs.has(key)) {
      refs.set(key, {
        key,
        async get() {
          const value = documents.get(key);
          return { exists: value !== undefined, data: () => clone(value) };
        },
      });
    }
    return refs.get(key);
  }
  return {
    documents,
    get transactionCount() { return transactions; },
    setRetryMutation(mutation) { retryMutation = mutation; },
    collection(name) {
      return { doc(id) { return refFor(name, id); } };
    },
    async runTransaction(callback) {
      transactions += 1;
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
      userId: 'synthetic-user', accountTypeAtIssue: 'STUDENT',
      issuedAt: new Date(issuedAt), lastSeenAt: new Date(issuedAt),
      expiresAt: new Date(issuedAt + 30 * 60 * 1000), csrfTokenHash: hash('old'),
    } });
    db.setRetryMutation(() => {});
    const store = createFirestoreAuthStore(db);
    let readings = 0;
    // Reading 1 is the fast-path check (2 minutes idle, so a write is due);
    // reading 2 is the first transaction attempt and reading 3 the retry.
    const result = await store.touchSession(id, () => {
      readings += 1;
      return issuedAt + (readings <= 2 ? 2 * 60 * 1000 : 30 * 60 * 1000);
    });
    expect(result).toBe(false);
    expect(readings).toBe(3);
    expect(db.documents.has(`loginSessions/${id}`)).toBe(false);
  });

  test('does not move last-seen time backward when the operation clock rolls back', async () => {
    const id = 'b'.repeat(64);
    const issuedAt = 1_800_000_000_000;
    const lastSeenAt = issuedAt + 10_000;
    const db = makeDb({ [`loginSessions/${id}`]: {
      userId: 'synthetic-user', accountTypeAtIssue: 'STUDENT', issuedAt: new Date(issuedAt),
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

describe('session touch throttling', () => {
  const id = 'd'.repeat(64);
  const issuedAt = 1_800_000_000_000;
  function sessionDb(lastSeenAt, expiresAt = lastSeenAt + 30 * 60 * 1000) {
    return makeDb({ [`loginSessions/${id}`]: {
      userId: 'synthetic-user', accountTypeAtIssue: 'TA', issuedAt: new Date(issuedAt),
      lastSeenAt: new Date(lastSeenAt), expiresAt: new Date(expiresAt), csrfTokenHash: hash('token'),
    } });
  }

  test('a request within a minute of the last touch is accepted without a write', async () => {
    const db = sessionDb(issuedAt);
    const store = createFirestoreAuthStore(db);
    expect(await store.touchSession(id, () => issuedAt + 59_999)).toBe(true);
    expect(db.transactionCount).toBe(0);
    expect(db.documents.get(`loginSessions/${id}`).lastSeenAt.getTime()).toBe(issuedAt);
  });

  test('concurrent requests on one session do not contend on the session document', async () => {
    const db = sessionDb(issuedAt);
    const store = createFirestoreAuthStore(db);
    const results = await Promise.all([1, 2, 3, 4].map((n) => store.touchSession(id, () => issuedAt + n)));
    expect(results).toEqual([true, true, true, true]);
    expect(db.transactionCount).toBe(0);
  });

  test('a request a minute or more after the last touch refreshes last-seen and expiry', async () => {
    const db = sessionDb(issuedAt);
    const store = createFirestoreAuthStore(db);
    const now = issuedAt + 60_000;
    expect(await store.touchSession(id, () => now)).toBe(true);
    expect(db.transactionCount).toBe(1);
    const stored = db.documents.get(`loginSessions/${id}`);
    expect(stored.lastSeenAt.getTime()).toBe(now);
    expect(stored.expiresAt.getTime()).toBe(now + 30 * 60 * 1000);
  });

  test.each([
    ['idle limit reached', issuedAt, issuedAt + 30 * 60 * 1000, issuedAt + 30 * 60 * 1000],
    ['stored expiry passed', issuedAt, issuedAt + 10_000, issuedAt + 10_000],
    ['absolute limit reached', issuedAt + 8 * 60 * 60 * 1000 - 1_000, issuedAt + 8 * 60 * 60 * 1000, issuedAt + 8 * 60 * 60 * 1000 + 60_000],
  ])('an expired session is still rejected and deleted (%s)', async (_label, lastSeenAt, now, expiresAt) => {
    const db = sessionDb(lastSeenAt, expiresAt);
    const store = createFirestoreAuthStore(db);
    expect(await store.touchSession(id, () => now)).toBe(false);
    expect(db.documents.has(`loginSessions/${id}`)).toBe(false);
  });

  test('a missing session is rejected without a transaction', async () => {
    const db = makeDb();
    const store = createFirestoreAuthStore(db);
    expect(await store.touchSession(id, () => issuedAt)).toBe(false);
    expect(db.transactionCount).toBe(0);
  });
});
