const { createFirestoreRateCounter } = require('../shared/firestore-rate-counter');

const COLLECTION = 'aiRateCounters';
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GLOBAL_LIMIT_PER_MINUTE = 40;
const MAX_GLOBAL_LIMIT_PER_MINUTE = 45;
const USER_LIMIT_PER_MINUTE = 5;
const USER_LIMIT_PER_DAY = 50;
const GLOBAL_IDENTIFIER = 'all';

const RESERVED = Object.freeze({ ok: true });
const RATE_LIMITED = Object.freeze({ ok: false, code: 'AI_RATE_LIMITED' });
const UNAVAILABLE = Object.freeze({ ok: false, code: 'AI_UNAVAILABLE' });

/**
 * AI rate limiter (spec R5). Reserves, in order, the per-user per-minute slot,
 * the per-user per-day slot, and the environment-wide per-minute slot in the
 * shared `aiRateCounters` collection. If a later slot is refused or the store
 * fails, slots already reserved for this call are released on a best-effort
 * basis. Store failures fail closed with `AI_UNAVAILABLE`.
 *
 * `userId` must come from the trusted server-resolved actor, never from input.
 */
function createAiRateLimiter({
  db,
  now = Date.now,
  globalLimitPerMinute = DEFAULT_GLOBAL_LIMIT_PER_MINUTE,
} = {}) {
  if (typeof now !== 'function') throw new TypeError('A clock function is required.');
  if (!Number.isInteger(globalLimitPerMinute) || globalLimitPerMinute < 1 ||
      globalLimitPerMinute > MAX_GLOBAL_LIMIT_PER_MINUTE) {
    throw new RangeError(`The global AI limit must be an integer from 1 to ${MAX_GLOBAL_LIMIT_PER_MINUTE}.`);
  }
  const counter = createFirestoreRateCounter(db, { collection: COLLECTION, countField: 'count' });

  const limits = [
    { kind: 'ai-user-minute', limit: USER_LIMIT_PER_MINUTE, windowMs: MINUTE_MS, scope: 'user' },
    { kind: 'ai-user-day', limit: USER_LIMIT_PER_DAY, windowMs: DAY_MS, scope: 'user' },
    { kind: 'ai-global-minute', limit: globalLimitPerMinute, windowMs: MINUTE_MS, scope: 'global' },
  ];

  async function releaseAll(reserved, userId) {
    for (const entry of reserved) {
      try {
        await counter.release(entry.kind, entry.scope === 'user' ? userId : GLOBAL_IDENTIFIER, now(), entry.windowMs);
      } catch {
        // Best effort: an unreleased slot only over-counts and so stays fail-safe.
      }
    }
  }

  return {
    /** Resolves `{ ok: true }`, `{ ok: false, code: 'AI_RATE_LIMITED' }`, or `{ ok: false, code: 'AI_UNAVAILABLE' }`. Never rejects. */
    async reserve(userId) {
      if (typeof userId !== 'string' || userId.length === 0) return UNAVAILABLE;
      const reserved = [];
      for (const entry of limits) {
        let granted;
        try {
          const current = now();
          if (!Number.isFinite(current)) throw new Error('Clock unavailable.');
          const identifier = entry.scope === 'user' ? userId : GLOBAL_IDENTIFIER;
          granted = await counter.reserve(entry.kind, identifier, entry.limit, current, entry.windowMs);
        } catch {
          await releaseAll(reserved, userId);
          return UNAVAILABLE;
        }
        if (granted !== true) {
          await releaseAll(reserved, userId);
          return granted === false ? RATE_LIMITED : UNAVAILABLE;
        }
        reserved.push(entry);
      }
      return RESERVED;
    },
  };
}

module.exports = {
  createAiRateLimiter,
  AI_RATE_COUNTER_COLLECTION: COLLECTION,
  DEFAULT_GLOBAL_LIMIT_PER_MINUTE,
  MAX_GLOBAL_LIMIT_PER_MINUTE,
  USER_LIMIT_PER_MINUTE,
  USER_LIMIT_PER_DAY,
};
