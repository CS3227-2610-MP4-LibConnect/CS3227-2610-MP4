const crypto = require('crypto');
const {
  createAiRateLimiter,
  AI_RATE_COUNTER_COLLECTION,
  DEFAULT_GLOBAL_LIMIT_PER_MINUTE,
  MAX_GLOBAL_LIMIT_PER_MINUTE,
  USER_LIMIT_PER_MINUTE,
  USER_LIMIT_PER_DAY,
} = require('../server/ai/rate-limit');

function fakeDb() {
  const records = new Map();
  let queue = Promise.resolve();
  let calls = 0;
  const state = { failOnCall: null, failAll: false };
  const db = {
    records,
    state,
    collection(name) { return { doc(id) { return { path: `${name}/${id}` }; } }; },
    runTransaction(callback) {
      calls += 1;
      const call = calls;
      const work = queue.then(async () => {
        if (state.failAll || state.failOnCall === call) throw new Error('synthetic store failure');
        const changes = new Map();
        const tx = {
          async get(ref) { const v = records.get(ref.path); return { exists: v !== undefined, data: () => v }; },
          set(ref, v) { changes.set(ref.path, { ...v }); },
          update(ref, p) { changes.set(ref.path, { ...records.get(ref.path), ...p }); },
          delete(ref) { changes.set(ref.path, undefined); },
        };
        const result = await callback(tx);
        for (const [k, v] of changes) { if (v === undefined) records.delete(k); else records.set(k, v); }
        return result;
      });
      queue = work.catch(() => undefined);
      return work;
    },
  };
  return db;
}

const sha = (v) => crypto.createHash('sha256').update(v, 'utf8').digest('hex');
const doc = (db, kind, id) => db.records.get(`${AI_RATE_COUNTER_COLLECTION}/${sha(`${kind}:${id}`)}`);
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function setup(options = {}) {
  const db = fakeDb();
  const clock = { t: 1_700_000_000_000 };
  const limiter = createAiRateLimiter({ db, now: () => clock.t, ...options });
  return { db, clock, limiter };
}

test('exports the spec constants', () => {
  expect(AI_RATE_COUNTER_COLLECTION).toBe('aiRateCounters');
  expect(DEFAULT_GLOBAL_LIMIT_PER_MINUTE).toBe(40);
  expect(MAX_GLOBAL_LIMIT_PER_MINUTE).toBe(45);
  expect(USER_LIMIT_PER_MINUTE).toBe(5);
  expect(USER_LIMIT_PER_DAY).toBe(50);
});

test('rejects out-of-range global limits', () => {
  const db = fakeDb();
  for (const bad of [0, 46, 1.5, '40']) {
    expect(() => createAiRateLimiter({ db, globalLimitPerMinute: bad })).toThrow(RangeError);
  }
  expect(() => createAiRateLimiter({ db, globalLimitPerMinute: 45 })).not.toThrow();
});

test('allows 5 calls per user per minute, then rate-limits', async () => {
  const { limiter } = setup();
  for (let i = 0; i < 5; i += 1) await expect(limiter.reserve('u1')).resolves.toEqual({ ok: true });
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_RATE_LIMITED' });
});

test('isolates users from each other', async () => {
  const { limiter } = setup();
  for (let i = 0; i < 5; i += 1) await limiter.reserve('u1');
  await expect(limiter.reserve('u1')).resolves.toMatchObject({ ok: false });
  await expect(limiter.reserve('u2')).resolves.toEqual({ ok: true });
});

test('per-minute window resets with a fake clock', async () => {
  const { limiter, clock } = setup();
  for (let i = 0; i < 5; i += 1) await limiter.reserve('u1');
  clock.t += MINUTE - 1;
  await expect(limiter.reserve('u1')).resolves.toMatchObject({ code: 'AI_RATE_LIMITED' });
  clock.t += 1;
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: true });
});

test('enforces 50 per user per day and resets after 24 hours', async () => {
  const { limiter, clock } = setup();
  const start = clock.t;
  for (let i = 0; i < 50; i += 1) {
    if (i % 5 === 0 && i > 0) clock.t += MINUTE;
    await expect(limiter.reserve('u1')).resolves.toEqual({ ok: true });
  }
  clock.t += MINUTE;
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_RATE_LIMITED' });
  clock.t = start + DAY;
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: true });
});

test('enforces the global per-minute limit across users', async () => {
  const { limiter, db } = setup({ globalLimitPerMinute: 3 });
  for (const u of ['a', 'b', 'c']) await expect(limiter.reserve(u)).resolves.toEqual({ ok: true });
  await expect(limiter.reserve('d')).resolves.toEqual({ ok: false, code: 'AI_RATE_LIMITED' });
  expect(doc(db, 'ai-global-minute', 'all').count).toBe(3);
  // The refused user's tentative slots were released.
  expect(doc(db, 'ai-user-minute', 'd')).toBeUndefined();
  expect(doc(db, 'ai-user-day', 'd')).toBeUndefined();
});

test('a user blocked by their own limit does not consume global capacity', async () => {
  const { limiter, db } = setup();
  for (let i = 0; i < 6; i += 1) await limiter.reserve('u1');
  expect(doc(db, 'ai-global-minute', 'all').count).toBe(5);
  expect(doc(db, 'ai-user-day', 'u1').count).toBe(5);
});

test('fails closed when the store errors', async () => {
  const { limiter, db } = setup();
  db.state.failAll = true;
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_UNAVAILABLE' });
});

test('releases earlier slots when a later reservation errors', async () => {
  const { limiter, db } = setup();
  db.state.failOnCall = 3; // user-minute, user-day succeed; global fails
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_UNAVAILABLE' });
  expect(doc(db, 'ai-user-minute', 'u1')).toBeUndefined();
  expect(doc(db, 'ai-user-day', 'u1')).toBeUndefined();
  expect(doc(db, 'ai-global-minute', 'all')).toBeUndefined();
});

test('still fails closed when release also errors', async () => {
  const { limiter, db } = setup();
  const original = db.runTransaction.bind(db);
  let n = 0;
  db.runTransaction = (cb) => { n += 1; return n >= 2 ? Promise.reject(new Error('down')) : original(cb); };
  await expect(limiter.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_UNAVAILABLE' });
  expect(n).toBe(3); // reserve, failed reserve, attempted release
});

test('fails closed on missing user id or broken clock', async () => {
  const { limiter } = setup();
  for (const bad of [undefined, null, '', 42]) {
    await expect(limiter.reserve(bad)).resolves.toEqual({ ok: false, code: 'AI_UNAVAILABLE' });
  }
  const broken = createAiRateLimiter({ db: fakeDb(), now: () => NaN });
  await expect(broken.reserve('u1')).resolves.toEqual({ ok: false, code: 'AI_UNAVAILABLE' });
});

test('stores hashed keys only, never the raw user id', async () => {
  const { limiter, db } = setup();
  await limiter.reserve('student-secret-id');
  expect([...db.records.keys()].join(' ')).not.toContain('student-secret-id');
  expect(JSON.stringify([...db.records.values()])).not.toContain('student-secret-id');
});
