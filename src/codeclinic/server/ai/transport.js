'use strict';

/**
 * SoCLaaS provider transport (spec `workflow/specs/ai-gateway.md` v0.1, R8).
 *
 * `createTransport(deps).send({ messages, maxOutputTokens })` performs one
 * logical provider call: `POST {baseUrl}/chat/completions`, a 20-second
 * timeout per attempt, at most one retry for 429/5xx/network/timeout after a
 * 1-2 second jittered delay, and a circuit breaker (5 consecutive failed calls
 * open it for 60 seconds). It never throws and never logs.
 *
 * Results:
 *
 *     { ok: true, response, attempts, usage }
 *     { ok: false, category, attempts, status? }
 *
 * `response` is the parsed JSON body of a 2xx reply, or `null` if that body is
 * not JSON; it is untrusted and goes only to `parse.js`. `usage` is the raw
 * provider `usage` object or `null`. Failure results carry only a category
 * from FAILURE_CATEGORIES and, for HTTP failures, the status code. Provider
 * error bodies are never read, and thrown errors are discarded, so neither
 * the key, the headers, nor provider text can leave this module.
 */

const TIMEOUT_MS = 20_000;
const RETRY_MIN_DELAY_MS = 1_000;
const RETRY_JITTER_MS = 1_000;
const MAX_RETRY_AFTER_MS = 5_000;
const BREAKER_FAILURE_THRESHOLD = 5;
const BREAKER_OPEN_MS = 60_000;

const FAILURE_CATEGORIES = Object.freeze({
  CONFIG_ERROR: 'CONFIG_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UPSTREAM_RATE_LIMITED: 'UPSTREAM_RATE_LIMITED',
  UPSTREAM_SERVER_ERROR: 'UPSTREAM_SERVER_ERROR',
  UPSTREAM_CLIENT_ERROR: 'UPSTREAM_CLIENT_ERROR',
});

const RETRYABLE = new Set([
  FAILURE_CATEGORIES.TIMEOUT,
  FAILURE_CATEGORIES.NETWORK_ERROR,
  FAILURE_CATEGORIES.UPSTREAM_RATE_LIMITED,
  FAILURE_CATEGORIES.UPSTREAM_SERVER_ERROR,
]);

const TIMED_OUT = Symbol('timed out');

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isValidMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (message) =>
        message !== null &&
        typeof message === 'object' &&
        typeof message.role === 'string' &&
        typeof message.content === 'string'
    )
  );
}

function isUsableConfig(config) {
  return (
    config !== null &&
    typeof config === 'object' &&
    typeof config.baseUrl === 'string' &&
    config.baseUrl !== '' &&
    typeof config.model === 'string' &&
    config.model !== '' &&
    typeof config.apiKey === 'string' &&
    config.apiKey !== ''
  );
}

/**
 * Parses a `Retry-After` value (delta-seconds or HTTP date) into milliseconds
 * from `nowMs`. Returns `null` when absent or unparseable.
 */
function parseRetryAfterMs(value, nowMs) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();
  if (/^[0-9]+$/.test(text)) return Number(text) * 1000;
  if (!/^[A-Za-z]{3}, /.test(text)) return null;
  const dateMs = Date.parse(text);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - nowMs);
}

function readHeader(response, name) {
  try {
    return response.headers && typeof response.headers.get === 'function' ? response.headers.get(name) : null;
  } catch {
    return null;
  }
}

function discardBody(response) {
  try {
    if (response.body && typeof response.body.cancel === 'function') {
      Promise.resolve(response.body.cancel()).catch(() => {});
    }
  } catch {
    // Ignored: the body is never needed for a failed reply.
  }
}

function categoryForStatus(status) {
  if (status === 429) return FAILURE_CATEGORIES.UPSTREAM_RATE_LIMITED;
  if (status >= 500 && status <= 599) return FAILURE_CATEGORIES.UPSTREAM_SERVER_ERROR;
  return FAILURE_CATEGORIES.UPSTREAM_CLIENT_ERROR;
}

function createTransport({
  config,
  fetch: fetchFn,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  sleep = defaultSleep,
  random = Math.random,
} = {}) {
  const configured = isUsableConfig(config) && typeof fetchFn === 'function';
  const url = configured ? `${config.baseUrl.replace(/\/+$/, '')}/chat/completions` : null;
  let consecutiveFailures = 0;
  let openUntil = 0;

  async function attempt(body) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimer(() => resolve(TIMED_OUT), TIMEOUT_MS);
    });
    const exchange = (async () => {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller ? controller.signal : undefined,
      });
      const status = Number(response && response.status);
      if (!(status >= 200 && status <= 299)) {
        discardBody(response);
        return {
          ok: false,
          category: categoryForStatus(status),
          status,
          retryAfter: readHeader(response, 'retry-after'),
        };
      }
      let parsed = null;
      try {
        parsed = JSON.parse(await response.text());
      } catch {
        parsed = null;
      }
      return { ok: true, response: parsed };
    })();
    // A rejection after the timeout wins the race must not surface as unhandled.
    exchange.catch(() => {});

    try {
      const outcome = await Promise.race([exchange, timeout]);
      if (outcome === TIMED_OUT) {
        if (controller) controller.abort();
        return { ok: false, category: FAILURE_CATEGORIES.TIMEOUT };
      }
      return outcome;
    } catch {
      return { ok: false, category: FAILURE_CATEGORIES.NETWORK_ERROR };
    } finally {
      clearTimer(timer);
    }
  }

  function retryDelayMs(failure) {
    const jittered = RETRY_MIN_DELAY_MS + Math.floor(Math.min(Math.max(random(), 0), 0.999) * RETRY_JITTER_MS);
    const retryAfterMs = parseRetryAfterMs(failure.retryAfter, now());
    if (retryAfterMs === null) return jittered;
    if (retryAfterMs > MAX_RETRY_AFTER_MS) return null;
    return Math.max(jittered, retryAfterMs);
  }

  function failure(result, attempts) {
    consecutiveFailures += 1;
    if (consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
      openUntil = now() + BREAKER_OPEN_MS;
    }
    const out = { ok: false, category: result.category, attempts };
    if (result.status !== undefined) out.status = result.status;
    return out;
  }

  async function send({ messages, maxOutputTokens } = {}) {
    if (!configured) {
      return { ok: false, category: FAILURE_CATEGORIES.CONFIG_ERROR, attempts: 0 };
    }
    if (!isValidMessages(messages) || !isPositiveInteger(maxOutputTokens)) {
      return { ok: false, category: FAILURE_CATEGORIES.INVALID_REQUEST, attempts: 0 };
    }
    if (now() < openUntil) {
      return { ok: false, category: FAILURE_CATEGORIES.CIRCUIT_OPEN, attempts: 0 };
    }

    const body = JSON.stringify({
      model: config.model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      max_tokens: maxOutputTokens,
      reasoning_effort: 'none',
    });

    let attempts = 1;
    let result = await attempt(body);
    if (!result.ok && RETRYABLE.has(result.category)) {
      const delay = retryDelayMs(result);
      if (delay !== null) {
        await sleep(delay);
        attempts = 2;
        result = await attempt(body);
      }
    }

    if (!result.ok) return failure(result, attempts);

    consecutiveFailures = 0;
    openUntil = 0;
    const response = result.response;
    const usage =
      response !== null && typeof response === 'object' && response.usage !== null && typeof response.usage === 'object'
        ? response.usage
        : null;
    return { ok: true, response, attempts, usage };
  }

  return Object.freeze({ send });
}

module.exports = {
  BREAKER_FAILURE_THRESHOLD,
  BREAKER_OPEN_MS,
  FAILURE_CATEGORIES,
  MAX_RETRY_AFTER_MS,
  RETRY_JITTER_MS,
  RETRY_MIN_DELAY_MS,
  TIMEOUT_MS,
  createTransport,
  parseRetryAfterMs,
};
