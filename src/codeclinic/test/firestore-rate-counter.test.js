const crypto = require('crypto');
const { createFirestoreRateCounter } = require('../server/shared/firestore-rate-counter');
const { createFirestoreAuthStore } = require('../server/auth/firestore-store');

function fakeDb() {
  const records = new Map();
  let queue = Promise.resolve();
  const state = { failNext: false };
  const db = {
    records,
    state,
    collection(name) {
      return { doc(id) { return { path: `${name}/${id}` }; } };
    },
    runTransaction(callback) {
      const work = queue.then(async () => {
        if (state.failNext) { state.failNext = false; throw new Error('synthetic store failure'); }
        const changes = new Map();
        const transaction = {
          async get(ref) {
            const value = records.get(ref.path);
            return { exists: value !== undefined, data: () => value };
          },
          set(ref, value) { changes.set(ref.path, { ...value }); },
          update(ref, patch) { changes.set(ref.path, { ...records.get(ref.path), ...patch }); },
          delete(ref) { changes.set(ref.path, undefined); },
        };
        const result = await callback(transaction);
        for (const [key, value] of changes) {
          if (value === undefined) records.delete(key); else records.set(key, value);
        }
        return result;
      });
      queue = work.catch(() => undefined);
      return work;
    },
  };
  return db;
}

const sha = (v) => crypto.createHash('sha256').update(v, 'utf8').digest('hex');
const MINUTE = 60 * 1000;

describe('createFirestoreRateCounter', () => {
  test('rejects invalid configuration', () => {
    expect(() => createFirestoreRateCounter(null, { collection: 'c' })).toThrow(TypeError);
    expect(() => createFirestoreRateCounter(fakeDb(), {})).toThrow(TypeError);
    expect(() => createFirestoreRateCounter(fakeDb(), { collection: 'c', countField: '' })).toThrow(TypeError);
  });

  test('reserves up to the limit, then refuses, and resets after the window', async () => {
    const counter = createFirestoreRateCounter(fakeDb(), { collection: 'c' });
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) await expect(counter.reserve('k', 'id', 3, t0 + i, MINUTE)).resolves.toBe(true);
    await expect(counter.reserve('k', 'id', 3, t0 + 10, MINUTE)).resolves.toBe(false);
    await expect(counter.reserve('k', 'id', 3, t0 + MINUTE - 1, MINUTE)).resolves.toBe(false);
    await expect(counter.reserve('k', 'id', 3, t0 + MINUTE, MINUTE)).resolves.toBe(true);
  });

  test('keeps kinds and identifiers isolated and hashes document keys', async () => {
    const db = fakeDb();
    const counter = createFirestoreRateCounter(db, { collection: 'c' });
    await counter.reserve('k', 'alice', 1, 0, MINUTE);
    await expect(counter.reserve('k', 'alice', 1, 1, MINUTE)).resolves.toBe(false);
    await expect(counter.reserve('k', 'bob', 1, 1, MINUTE)).resolves.toBe(true);
    await expect(counter.reserve('other', 'alice', 1, 1, MINUTE)).resolves.toBe(true);
    const keys = [...db.records.keys()];
    expect(keys).toContain(`c/${sha('k:alice')}`);
    expect(keys.join(' ')).not.toMatch(/alice|bob/);
  });

  test('stores the configured count field and window metadata', async () => {
    const db = fakeDb();
    const counter = createFirestoreRateCounter(db, { collection: 'c', countField: 'hits' });
    await counter.reserve('k', 'id', 5, 1000, MINUTE);
    await counter.reserve('k', 'id', 5, 2000, MINUTE);
    expect(db.records.get(`c/${sha('k:id')}`)).toEqual({
      kind: 'k', windowStart: new Date(1000), hits: 2, expiresAt: new Date(1000 + MINUTE),
    });
  });

  test('release decrements, deletes at zero, and ignores ended windows', async () => {
    const db = fakeDb();
    const counter = createFirestoreRateCounter(db, { collection: 'c' });
    const path = `c/${sha('k:id')}`;
    await counter.reserve('k', 'id', 2, 0, MINUTE);
    await counter.reserve('k', 'id', 2, 1, MINUTE);
    await counter.release('k', 'id', 2, MINUTE);
    expect(db.records.get(path).count).toBe(1);
    await counter.release('k', 'id', MINUTE, MINUTE);
    expect(db.records.get(path).count).toBe(1);
    await counter.release('k', 'id', 3, MINUTE);
    expect(db.records.has(path)).toBe(false);
    await expect(counter.release('k', 'id', 4, MINUTE)).resolves.toBeUndefined();
  });

  test('propagates store failures', async () => {
    const db = fakeDb();
    const counter = createFirestoreRateCounter(db, { collection: 'c' });
    db.state.failNext = true;
    await expect(counter.reserve('k', 'id', 1, 0, MINUTE)).rejects.toThrow('synthetic store failure');
  });
});

describe('auth store delegation parity', () => {
  test('keeps loginFailureCounters key, fields, and behaviour', async () => {
    const db = fakeDb();
    const store = createFirestoreAuthStore(db);
    const path = `loginFailureCounters/${sha('email:reader@example.test')}`;
    await expect(store.reserveRateSlot('email', 'reader@example.test', 2, 5000, MINUTE)).resolves.toBe(true);
    await expect(store.reserveRateSlot('email', 'reader@example.test', 2, 5001, MINUTE)).resolves.toBe(true);
    await expect(store.reserveRateSlot('email', 'reader@example.test', 2, 5002, MINUTE)).resolves.toBe(false);
    expect(db.records.get(path)).toEqual({
      kind: 'email', windowStart: new Date(5000), failureCount: 2, expiresAt: new Date(5000 + MINUTE),
    });
    await store.releaseRateSlot('email', 'reader@example.test', 5003, MINUTE);
    expect(db.records.get(path).failureCount).toBe(1);
    await store.releaseRateSlot('email', 'reader@example.test', 5004, MINUTE);
    expect(db.records.has(path)).toBe(false);
  });

  test('reads legacy failureCount documents written before the refactor', async () => {
    const db = fakeDb();
    db.records.set(`loginFailureCounters/${sha('ip:1')}`, {
      kind: 'ip', windowStart: new Date(0), failureCount: 3, expiresAt: new Date(MINUTE),
    });
    const store = createFirestoreAuthStore(db);
    await expect(store.reserveRateSlot('ip', '1', 3, 10, MINUTE)).resolves.toBe(false);
  });
});

