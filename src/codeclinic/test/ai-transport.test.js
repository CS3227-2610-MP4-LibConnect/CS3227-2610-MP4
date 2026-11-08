const {
  BREAKER_OPEN_MS,
  FAILURE_CATEGORIES,
  TIMEOUT_MS,
  createTransport,
  parseRetryAfterMs,
} = require('../server/ai/transport');

const FAKE_KEY = 'test-key-not-real';

function fakeConfig(overrides = {}) {
  const config = { baseUrl: 'https://llm.example.test/v1', model: 'approved-model', globalLimitPerMinute: 40 };
  Object.defineProperty(config, 'apiKey', { value: FAKE_KEY, enumerable: false });
  return Object.assign(config, overrides);
}

const MESSAGES = [
  { role: 'system', content: 'fixed system' },
  { role: 'user', content: 'untrusted user content' },
];

function reply(status, { json, text, headers = {} } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    headers: { get: (name) => (name.toLowerCase() in lower ? lower[name.toLowerCase()] : null) },
    text: jest.fn(async () => (text !== undefined ? text : JSON.stringify(json))),
  };
}

const NEVER = () => new Promise(() => {});

function harness({ responses = [], fireTimeouts = false, random = () => 0.5 } = {}) {
  let clock = 0;
  const calls = [];
  const sleeps = [];
  const timers = [];
  const queue = [...responses];
  const fetch = jest.fn(async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const next = queue.length > 0 ? queue.shift() : reply(200, { json: okBody() });
    if (typeof next === 'function') return next();
    if (next instanceof Error) throw next;
    return next;
  });
  const transport = createTransport({
    config: fakeConfig(),
    fetch,
    now: () => clock,
    setTimer: (fn, ms) => {
      const timer = { fn, ms, cleared: false };
      timers.push(timer);
      if (fireTimeouts && ms === TIMEOUT_MS) Promise.resolve().then(() => !timer.cleared && fn());
      return timer;
    },
    clearTimer: (timer) => {
      if (timer) timer.cleared = true;
    },
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    random,
  });
  return {
    transport,
    fetch,
    calls,
    sleeps,
    timers,
    advance: (ms) => {
      clock += ms;
    },
  };
}

function okBody(content = '{"answer":"ok"}') {
  return {
    choices: [{ message: { role: 'assistant', content } }],
    usage: { prompt_tokens: 12, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 8 } },
  };
}

function send(transport, extra = {}) {
  return transport.send({ messages: MESSAGES, maxOutputTokens: 300, ...extra });
}

describe('AI transport request', () => {
  test('posts the configured model, max_tokens, and reasoning_effort with a Bearer header', async () => {
    const h = harness();
    const result = await send(h.transport);

    expect(result).toEqual({ ok: true, response: okBody(), attempts: 1, usage: okBody().usage });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [{ url, init, body }] = h.calls;
    expect(url).toBe('https://llm.example.test/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: `Bearer ${FAKE_KEY}`, 'Content-Type': 'application/json' });
    expect(body).toEqual({ model: 'approved-model', messages: MESSAGES, max_tokens: 300, reasoning_effort: 'none' });
    expect(body).not.toHaveProperty('stream');
    expect(h.timers[0].ms).toBe(TIMEOUT_MS);
    expect(h.timers[0].cleared).toBe(true);
  });

  test('ignores a caller-supplied model and extra message fields', async () => {
    const h = harness();
    await h.transport.send({
      messages: [{ role: 'user', content: 'x', model: 'evil-model', name: 'n' }],
      maxOutputTokens: 10,
      model: 'evil-model',
    });
    expect(h.calls[0].body.model).toBe('approved-model');
    expect(h.calls[0].body.messages).toEqual([{ role: 'user', content: 'x' }]);
    expect(JSON.stringify(h.calls[0].body)).not.toContain('evil-model');
  });

  test('returns usage null and response null for a non-JSON success body', async () => {
    const h = harness({ responses: [reply(200, { text: 'not json' })] });
    expect(await send(h.transport)).toEqual({ ok: true, response: null, attempts: 1, usage: null });
  });

  test('rejects unusable config or request without calling the provider', async () => {
    const fetch = jest.fn();
    const noKey = createTransport({ config: { baseUrl: 'https://x.test/v1', model: 'm' }, fetch });
    expect(await noKey.send({ messages: MESSAGES, maxOutputTokens: 1 })).toEqual({
      ok: false,
      category: FAILURE_CATEGORIES.CONFIG_ERROR,
      attempts: 0,
    });
    expect(await createTransport({}).send({ messages: MESSAGES, maxOutputTokens: 1 })).toMatchObject({
      category: FAILURE_CATEGORIES.CONFIG_ERROR,
    });

    const h = harness();
    for (const bad of [
      { messages: [], maxOutputTokens: 1 },
      { messages: [{ role: 'user', content: 3 }], maxOutputTokens: 1 },
      { messages: MESSAGES, maxOutputTokens: 0 },
      { messages: MESSAGES, maxOutputTokens: 1.5 },
      undefined,
    ]) {
      expect(await h.transport.send(bad)).toEqual({ ok: false, category: FAILURE_CATEGORIES.INVALID_REQUEST, attempts: 0 });
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });
});

describe('AI transport retries', () => {
  test.each([
    [429, FAILURE_CATEGORIES.UPSTREAM_RATE_LIMITED],
    [500, FAILURE_CATEGORIES.UPSTREAM_SERVER_ERROR],
    [503, FAILURE_CATEGORIES.UPSTREAM_SERVER_ERROR],
  ])('retries HTTP %i once after a 1-2 s jittered delay, then fails', async (status, category) => {
    const h = harness({ responses: [reply(status), reply(status)] });
    const result = await send(h.transport);
    expect(result).toEqual({ ok: false, category, attempts: 2, status });
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.sleeps).toEqual([1500]);
  });

  test('a retry that succeeds returns ok with two attempts', async () => {
    const h = harness({ responses: [reply(502), reply(200, { json: okBody() })] });
    expect(await send(h.transport)).toMatchObject({ ok: true, attempts: 2 });
  });

  test('retries a network error once', async () => {
    const h = harness({ responses: [new TypeError('fetch failed'), new TypeError('fetch failed')] });
    expect(await send(h.transport)).toEqual({ ok: false, category: FAILURE_CATEGORIES.NETWORK_ERROR, attempts: 2 });
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });

  test('times out each attempt at 20 s, aborts it, and retries once', async () => {
    const h = harness({ responses: [NEVER, NEVER], fireTimeouts: true });
    expect(await send(h.transport)).toEqual({ ok: false, category: FAILURE_CATEGORIES.TIMEOUT, attempts: 2 });
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.calls.every(({ init }) => init.signal.aborted)).toBe(true);
    expect(h.timers.filter((t) => t.ms === TIMEOUT_MS)).toHaveLength(2);
  });

  test('the jittered delay stays within 1-2 seconds', async () => {
    for (const [r, expected] of [
      [0, 1000],
      [0.999999, 1999],
      [1, 1999],
    ]) {
      const h = harness({ responses: [reply(500), reply(500)], random: () => r });
      await send(h.transport);
      expect(h.sleeps).toEqual([expected]);
    }
  });

  test.each([400, 401, 403, 404, 422])('does not retry HTTP %i or read its body', async (status) => {
    const failed = reply(status, { text: 'provider secret detail' });
    const h = harness({ responses: [failed] });
    const result = await send(h.transport);
    expect(result).toEqual({ ok: false, category: FAILURE_CATEGORIES.UPSTREAM_CLIENT_ERROR, attempts: 1, status });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.sleeps).toEqual([]);
    expect(failed.text).not.toHaveBeenCalled();
  });

  test('a Retry-After above 5 seconds means no retry', async () => {
    const h = harness({ responses: [reply(429, { headers: { 'Retry-After': '6' } })] });
    expect(await send(h.transport)).toEqual({
      ok: false,
      category: FAILURE_CATEGORIES.UPSTREAM_RATE_LIMITED,
      attempts: 1,
      status: 429,
    });
    expect(h.sleeps).toEqual([]);
  });

  test('a Retry-After of at most 5 seconds is honoured as the minimum delay', async () => {
    const h = harness({ responses: [reply(429, { headers: { 'Retry-After': '4' } }), reply(200, { json: okBody() })] });
    expect(await send(h.transport)).toMatchObject({ ok: true, attempts: 2 });
    expect(h.sleeps).toEqual([4000]);

    const short = harness({ responses: [reply(503, { headers: { 'Retry-After': '0' } }), reply(503)] });
    await send(short.transport);
    expect(short.sleeps).toEqual([1500]);
  });

  test('parses Retry-After seconds and HTTP dates', () => {
    expect(parseRetryAfterMs('3', 0)).toBe(3000);
    expect(parseRetryAfterMs(' 10 ', 0)).toBe(10000);
    expect(parseRetryAfterMs('Thu, 01 Jan 1970 00:00:07 GMT', 1000)).toBe(6000);
    expect(parseRetryAfterMs('Thu, 01 Jan 1970 00:00:00 GMT', 1000)).toBe(0);
    expect(parseRetryAfterMs(null, 0)).toBeNull();
    expect(parseRetryAfterMs('', 0)).toBeNull();
    expect(parseRetryAfterMs('-1', 0)).toBeNull();
    expect(parseRetryAfterMs('soon', 0)).toBeNull();
  });
});

describe('AI transport circuit breaker', () => {
  test('opens after 5 consecutive failed calls for 60 s, then resumes', async () => {
    const h = harness({ responses: Array(5).fill(reply(401)) });
    for (let i = 0; i < 5; i += 1) {
      expect(await send(h.transport)).toMatchObject({ ok: false, category: FAILURE_CATEGORIES.UPSTREAM_CLIENT_ERROR });
    }
    expect(h.fetch).toHaveBeenCalledTimes(5);

    expect(await send(h.transport)).toEqual({ ok: false, category: FAILURE_CATEGORIES.CIRCUIT_OPEN, attempts: 0 });
    h.advance(BREAKER_OPEN_MS - 1);
    expect(await send(h.transport)).toMatchObject({ category: FAILURE_CATEGORIES.CIRCUIT_OPEN });
    expect(h.fetch).toHaveBeenCalledTimes(5);

    h.advance(1);
    expect(await send(h.transport)).toMatchObject({ ok: true, attempts: 1 });
    expect(h.fetch).toHaveBeenCalledTimes(6);
  });

  test('a success resets the consecutive-failure count', async () => {
    const h = harness({
      responses: [...Array(4).fill(reply(400)), reply(200, { json: okBody() }), ...Array(4).fill(reply(400))],
    });
    for (let i = 0; i < 9; i += 1) await send(h.transport);
    expect(await send(h.transport)).toMatchObject({ ok: true });
    expect(h.fetch).toHaveBeenCalledTimes(10);
  });

  test('a failed trial call after the open period reopens the breaker', async () => {
    const h = harness({ responses: Array(6).fill(reply(403)) });
    for (let i = 0; i < 5; i += 1) await send(h.transport);
    h.advance(BREAKER_OPEN_MS);
    expect(await send(h.transport)).toMatchObject({ category: FAILURE_CATEGORIES.UPSTREAM_CLIENT_ERROR });
    expect(await send(h.transport)).toMatchObject({ category: FAILURE_CATEGORIES.CIRCUIT_OPEN });
    expect(h.fetch).toHaveBeenCalledTimes(6);
  });

  test('a retried call counts as one failure', async () => {
    const h = harness({ responses: Array(10).fill(reply(500)) });
    for (let i = 0; i < 4; i += 1) await send(h.transport);
    expect(h.fetch).toHaveBeenCalledTimes(8);
    expect(await send(h.transport)).toMatchObject({ category: FAILURE_CATEGORIES.UPSTREAM_SERVER_ERROR });
  });

  test('config and request errors do not count toward the breaker', async () => {
    const h = harness();
    for (let i = 0; i < 6; i += 1) await h.transport.send({ messages: [], maxOutputTokens: 1 });
    expect(await send(h.transport)).toMatchObject({ ok: true });
  });
});

describe('AI transport non-disclosure', () => {
  test('results never contain the key, the header, or provider bodies, and nothing is logged', async () => {
    const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    try {
      const h = harness({
        responses: [
          reply(401, { text: `bad key ${FAKE_KEY}` }),
          () => {
            throw new Error(`network failed Authorization: Bearer ${FAKE_KEY}`);
          },
          () => {
            throw new Error('again');
          },
          reply(500, { text: 'internal provider trace' }),
          reply(500, { text: 'internal provider trace' }),
        ],
      });
      const results = [await send(h.transport), await send(h.transport), await send(h.transport)];
      const serialised = JSON.stringify(results);
      expect(serialised).not.toContain(FAKE_KEY);
      expect(serialised).not.toContain('Authorization');
      expect(serialised).not.toContain('Bearer');
      expect(serialised).not.toContain('provider');
      expect(serialised).not.toContain('network failed');
      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
