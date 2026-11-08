const {
  createUsageStore,
  USAGE_COLLECTION,
  USAGE_OUTCOMES,
} = require('../server/ai/usage-store');

const FIXED_NOW = Date.UTC(2026, 10, 8, 9, 30, 0);
const FAKE_KEY = 'test-key-not-real';
const RECORD_KEYS = [
  'attempts',
  'cachedTokens',
  'createdAt',
  'feature',
  'inputTokens',
  'latencyMs',
  'outcome',
  'outputTokens',
  'usageId',
  'userId',
].sort();

function makeDb({ failWith } = {}) {
  const writes = [];
  return {
    writes,
    collection(name) {
      return {
        doc(id) {
          return {
            async set(data) {
              if (failWith) throw failWith;
              writes.push({ collection: name, id, data });
            },
          };
        },
      };
    },
  };
}

function makeLogger() {
  const lines = [];
  const capture = (...args) => lines.push(args);
  return { lines, warn: capture, error: capture, info: capture, log: capture };
}

function makeStore(overrides = {}) {
  const db = overrides.db || makeDb();
  const logger = overrides.logger || makeLogger();
  let next = 0;
  const store = createUsageStore({
    db,
    clock: () => FIXED_NOW,
    randomId: () => `usage-${++next}`,
    logger,
  });
  return { store, db, logger };
}

const baseEntry = Object.freeze({
  userId: 'student-1',
  feature: 'FAKE_FEATURE',
  outcome: 'SUCCESS',
  attempts: 1,
  latencyMs: 812,
});

describe('AI usage store', () => {
  test('writes one aiUsage document with the R11 fields and provider token counts', async () => {
    const { store, db } = makeStore();
    const written = await store.record({
      ...baseEntry,
      usage: { prompt_tokens: 120, completion_tokens: 45, prompt_tokens_details: { cached_tokens: 64 } },
    });

    expect(written).toBe(true);
    expect(db.writes).toHaveLength(1);
    const [{ collection, id, data }] = db.writes;
    expect(collection).toBe('aiUsage');
    expect(USAGE_COLLECTION).toBe('aiUsage');
    expect(id).toBe('usage-1');
    expect(Object.keys(data).sort()).toEqual(RECORD_KEYS);
    expect(data).toEqual({
      usageId: 'usage-1',
      userId: 'student-1',
      feature: 'FAKE_FEATURE',
      outcome: 'SUCCESS',
      attempts: 1,
      latencyMs: 812,
      createdAt: new Date(FIXED_NOW),
      inputTokens: 120,
      outputTokens: 45,
      cachedTokens: 64,
    });
  });

  test('stores null token counts when usage is absent or partial', async () => {
    const { store, db } = makeStore();
    await store.record({ ...baseEntry, outcome: 'TIMEOUT', attempts: 2 });
    await store.record({ ...baseEntry, outcome: 'PROVIDER_ERROR', usage: { prompt_tokens: 10 } });
    await store.record({
      ...baseEntry,
      usage: { prompt_tokens: -1, completion_tokens: '9', prompt_tokens_details: null },
    });

    expect(db.writes.map((write) => write.data).map(({ inputTokens, outputTokens, cachedTokens }) => ({
      inputTokens, outputTokens, cachedTokens,
    }))).toEqual([
      { inputTokens: null, outputTokens: null, cachedTokens: null },
      { inputTokens: 10, outputTokens: null, cachedTokens: null },
      { inputTokens: null, outputTokens: null, cachedTokens: null },
    ]);
  });

  test('accepts every R11 outcome', async () => {
    const { store, db } = makeStore();
    for (const outcome of USAGE_OUTCOMES) {
      await expect(store.record({ ...baseEntry, outcome })).resolves.toBe(true);
    }
    expect(db.writes.map((write) => write.data.outcome)).toEqual([
      'SUCCESS', 'RATE_LIMITED', 'TIMEOUT', 'INVALID_OUTPUT', 'PROVIDER_ERROR', 'INPUT_TOO_LARGE', 'DISABLED',
    ]);
  });

  test('swallows a write failure without rejecting and logs no content', async () => {
    const failure = new Error(`write failed for prompt "secret prompt" with ${FAKE_KEY}`);
    const { store, logger } = makeStore({ db: makeDb({ failWith: failure }) });

    await expect(store.record({ ...baseEntry, usage: { prompt_tokens: 3 } })).resolves.toBe(false);
    expect(logger.lines).toHaveLength(1);
    const logged = JSON.stringify(logger.lines);
    expect(logged).not.toContain('secret prompt');
    expect(logged).not.toContain(FAKE_KEY);
    expect(logged).not.toContain('student-1');
  });

  test('swallows a synchronous store or clock failure', async () => {
    const throwingDb = { collection() { throw new Error('boom'); } };
    const logger = makeLogger();
    const store = createUsageStore({ db: throwingDb, clock: () => FIXED_NOW, randomId: () => 'x', logger });
    await expect(store.record(baseEntry)).resolves.toBe(false);

    const clockStore = createUsageStore({ db: makeDb(), clock: () => { throw new Error('clock'); }, logger });
    await expect(clockStore.record(baseEntry)).resolves.toBe(false);
  });

  test('never writes content, key, or provider fields even if passed in', async () => {
    const { store, db } = makeStore();
    await store.record({
      ...baseEntry,
      outcome: 'INVALID_OUTPUT',
      prompt: 'explain this secret prompt',
      messages: [{ role: 'user', content: 'raw user content' }],
      input: 'raw input',
      response: 'model reply text',
      output: { text: 'model output text' },
      content: 'content text',
      apiKey: FAKE_KEY,
      key: FAKE_KEY,
      headers: { Authorization: `Bearer ${FAKE_KEY}` },
      error: 'provider error body',
      errorBody: 'provider error body',
      model: 'client-model',
      usage: {
        prompt_tokens: 5,
        completion_tokens: 6,
        prompt_tokens_details: { cached_tokens: 0, text: 'details text' },
        extra: 'usage extra text',
      },
    });

    expect(db.writes).toHaveLength(1);
    const { data } = db.writes[0];
    expect(Object.keys(data).sort()).toEqual(RECORD_KEYS);
    const serialized = JSON.stringify(data);
    for (const forbidden of [
      'secret prompt', 'raw user content', 'raw input', 'model reply text', 'model output text',
      'content text', FAKE_KEY, 'Bearer', 'provider error body', 'client-model', 'details text', 'usage extra text',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(data.cachedTokens).toBe(0);
  });

  test('rejects malformed metadata without writing or throwing', async () => {
    const { store, db } = makeStore();
    const cases = [
      null,
      { ...baseEntry, userId: '' },
      { ...baseEntry, userId: 42 },
      { ...baseEntry, feature: undefined },
      { ...baseEntry, outcome: 'UNKNOWN' },
      { ...baseEntry, attempts: -1 },
      { ...baseEntry, attempts: 1.5 },
      { ...baseEntry, latencyMs: Number.NaN },
      { ...baseEntry, latencyMs: -5 },
    ];
    for (const entry of cases) {
      await expect(store.record(entry)).resolves.toBe(false);
    }
    expect(db.writes).toHaveLength(0);
  });

  test('rounds latency and requires a Firestore-compatible db', async () => {
    const { store, db } = makeStore();
    await store.record({ ...baseEntry, latencyMs: 12.6 });
    expect(db.writes[0].data.latencyMs).toBe(13);
    expect(() => createUsageStore({})).toThrow(TypeError);
  });
});
