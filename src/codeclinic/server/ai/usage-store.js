const crypto = require('crypto');

const USAGE_COLLECTION = 'aiUsage';
const USAGE_OUTCOMES = Object.freeze([
  'SUCCESS',
  'RATE_LIMITED',
  'TIMEOUT',
  'INVALID_OUTPUT',
  'PROVIDER_ERROR',
  'INPUT_TOO_LARGE',
  'DISABLED',
]);
const WRITE_FAILURE_MESSAGE = 'AI usage record could not be written.';

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * Maps a provider `usage` object to token counts. Only the three numeric
 * fields are read; anything else in the object is ignored.
 */
function tokenCounts(usage) {
  const source = usage && typeof usage === 'object' ? usage : {};
  const details = source.prompt_tokens_details && typeof source.prompt_tokens_details === 'object'
    ? source.prompt_tokens_details
    : {};
  return {
    inputTokens: tokenCount(source.prompt_tokens),
    outputTokens: tokenCount(source.completion_tokens),
    cachedTokens: tokenCount(details.cached_tokens),
  };
}

/**
 * Builds the R11 record from an explicit allow-list of fields. Returns null
 * when a required metadata field is malformed. No caller-supplied property
 * other than the listed ones can reach the stored document.
 */
function buildUsageRecord(entry, usageId, createdAt) {
  if (!entry || typeof entry !== 'object') return null;
  const { userId, feature, outcome, attempts, latencyMs, usage } = entry;
  if (typeof userId !== 'string' || userId.length === 0) return null;
  if (typeof feature !== 'string' || feature.length === 0) return null;
  if (!USAGE_OUTCOMES.includes(outcome)) return null;
  if (!Number.isSafeInteger(attempts) || attempts < 0) return null;
  if (typeof latencyMs !== 'number' || !Number.isFinite(latencyMs) || latencyMs < 0) return null;
  return {
    usageId,
    userId,
    feature,
    outcome,
    attempts,
    latencyMs: Math.round(latencyMs),
    createdAt,
    ...tokenCounts(usage),
  };
}

/**
 * Firestore-backed writer for `aiUsage/{usageId}` documents (spec R11).
 *
 * deps.db       Firestore-compatible object exposing collection(name).doc(id).set(data)
 * deps.clock    () => epoch milliseconds (default Date.now)
 * deps.randomId () => unique document id (default crypto.randomUUID)
 * deps.logger   object with warn(message); receives only a fixed message
 */
function createUsageStore({ db, clock = Date.now, randomId = crypto.randomUUID, logger = console } = {}) {
  if (!db || typeof db.collection !== 'function') {
    throw new TypeError('A Firestore-compatible usage store is required.');
  }

  function reportFailure() {
    try {
      if (logger && typeof logger.warn === 'function') logger.warn(WRITE_FAILURE_MESSAGE);
    } catch {
      // Logging must never affect the caller.
    }
  }

  /**
   * Writes one usage record. Never throws or rejects; resolves true when the
   * document was written and false otherwise, so the caller's result is
   * unaffected by a usage-write failure.
   */
  async function record(entry) {
    try {
      const usageId = randomId();
      const record = buildUsageRecord(entry, usageId, new Date(clock()));
      if (!record) {
        reportFailure();
        return false;
      }
      await db.collection(USAGE_COLLECTION).doc(usageId).set(record);
      return true;
    } catch {
      // Error objects may carry request or document content; drop them.
      reportFailure();
      return false;
    }
  }

  return Object.freeze({ record });
}

module.exports = {
  createUsageStore,
  buildUsageRecord,
  tokenCounts,
  USAGE_COLLECTION,
  USAGE_OUTCOMES,
};
