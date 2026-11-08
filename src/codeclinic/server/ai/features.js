'use strict';

/**
 * AI feature registry (spec `workflow/specs/ai-gateway.md` v0.1, R3).
 *
 * A feature registers once, in trusted server code, with:
 *
 * - `feature`: one of FEATURE_NAMES.
 * - `systemPrompt`: a fixed, non-empty string. It must not contain
 *   per-request values (R7); it is combined with the shared preamble.
 * - `buildUserContent(input)`: returns the untrusted content (a string) for the
 *   user message. The gateway redacts and caps it before prompt construction.
 * - `maxInputChars`: positive integer cap on user content after redaction.
 * - `maxOutputTokens`: positive integer sent to the provider as `max_tokens`.
 * - `parse(parsedJson)`: validates the already JSON-parsed model output against
 *   the feature's schema.
 *
 * `parse` contract:
 *
 *     parse(parsedJson) -> { ok: true, data } | { ok: false }
 *
 * `parsedJson` is untrusted model output. `parse` must be synchronous, must not
 * render or execute it, and must return `{ ok: false }` (with no other
 * information required) for any value that fails the schema. The gateway maps
 * `{ ok: false }`, a non-conforming return value, or a thrown error to
 * `AI_INVALID_OUTPUT`.
 *
 * Lookups of unknown or unregistered feature names return `null`, so the
 * gateway can reject them before any provider call. Registration of an invalid
 * definition throws, because it is a server programming error at startup.
 */

const FEATURE_NAMES = Object.freeze(['ERROR_EXPLAINER', 'FIX_NOTE_DRAFTER', 'QUEUE_INSIGHTS']);

const DEFINITION_KEYS = Object.freeze([
  'feature',
  'systemPrompt',
  'buildUserContent',
  'maxInputChars',
  'maxOutputTokens',
  'parse',
]);

class FeatureDefinitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FeatureDefinitionError';
  }
}

function isAllowedFeatureName(name) {
  return typeof name === 'string' && FEATURE_NAMES.includes(name);
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Validates a feature definition. Returns `{ ok: true }` or
 * `{ ok: false, reason }`; the reason names only the offending field and never
 * echoes field values.
 */
function validateFeatureDefinition(definition) {
  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
    return { ok: false, reason: 'definition must be an object' };
  }
  const extra = Object.keys(definition).filter((key) => !DEFINITION_KEYS.includes(key));
  if (extra.length > 0) {
    return { ok: false, reason: `unexpected field(s): ${extra.join(', ')}` };
  }
  if (!isAllowedFeatureName(definition.feature)) {
    return { ok: false, reason: 'feature must be one of the allowed feature names' };
  }
  if (typeof definition.systemPrompt !== 'string' || definition.systemPrompt.trim() === '') {
    return { ok: false, reason: 'systemPrompt must be a non-empty string' };
  }
  if (typeof definition.buildUserContent !== 'function') {
    return { ok: false, reason: 'buildUserContent must be a function' };
  }
  if (!isPositiveInteger(definition.maxInputChars)) {
    return { ok: false, reason: 'maxInputChars must be a positive integer' };
  }
  if (!isPositiveInteger(definition.maxOutputTokens)) {
    return { ok: false, reason: 'maxOutputTokens must be a positive integer' };
  }
  if (typeof definition.parse !== 'function') {
    return { ok: false, reason: 'parse must be a function' };
  }
  return { ok: true };
}

function createFeatureRegistry() {
  const features = new Map();

  return Object.freeze({
    /** Registers a definition once; throws FeatureDefinitionError if invalid or duplicate. */
    register(definition) {
      const result = validateFeatureDefinition(definition);
      if (!result.ok) {
        throw new FeatureDefinitionError(`Invalid AI feature definition: ${result.reason}`);
      }
      if (features.has(definition.feature)) {
        throw new FeatureDefinitionError(`AI feature already registered: ${definition.feature}`);
      }
      const frozen = Object.freeze({
        feature: definition.feature,
        systemPrompt: definition.systemPrompt,
        buildUserContent: definition.buildUserContent,
        maxInputChars: definition.maxInputChars,
        maxOutputTokens: definition.maxOutputTokens,
        parse: definition.parse,
      });
      features.set(frozen.feature, frozen);
      return frozen;
    },

    /** Returns the frozen definition, or `null` for unknown or unregistered names. */
    get(name) {
      if (!isAllowedFeatureName(name)) {
        return null;
      }
      return features.get(name) || null;
    },

    has(name) {
      return this.get(name) !== null;
    },

    names() {
      return Array.from(features.keys());
    },
  });
}

module.exports = {
  FEATURE_NAMES,
  FeatureDefinitionError,
  createFeatureRegistry,
  isAllowedFeatureName,
  validateFeatureDefinition,
};
