'use strict';

const { loadAiConfig } = require('./config');
const { createFeatureRegistry } = require('./features');
const { redactAndCap } = require('./redact');
const { buildMessages } = require('./prompt');
const { createTransport } = require('./transport');
const { parseModelOutput } = require('./parse');
const { createAiRateLimiter } = require('./rate-limit');
const { createUsageStore } = require('./usage-store');

const UNAVAILABLE = Object.freeze({ ok: false, code: 'AI_UNAVAILABLE' });

// Trusted server callers authorize the actor and input before invoking run.
// Collaborators are injectable so tests never require a provider or real key.
function createAiGateway({
  env = {}, db, registry = createFeatureRegistry(), now = Date.now,
  fetch: fetchFn = globalThis.fetch, logger = console,
  rateLimiter, usageStore, transport,
} = {}) {
  const state = loadAiConfig(env);
  if (!state.enabled) {
    try { logger.info(state.reason); } catch { /* Logging cannot stop startup. */ }
  }
  const limiter = rateLimiter || (state.enabled ? createAiRateLimiter({
    db, now, globalLimitPerMinute: state.config.globalLimitPerMinute,
  }) : null);
  const usage = usageStore || createUsageStore({ db, clock: now, logger });
  const provider = transport || (state.enabled ? createTransport({
    config: state.config, fetch: fetchFn, now,
  }) : null);

  async function run(request) {
    let definition;
    let userId;
    let startedAt;
    let outcome = 'PROVIDER_ERROR';
    let attempts = 0;
    let providerUsage = null;
    try {
      definition = registry.get(request && request.feature);
      if (!definition) return UNAVAILABLE;
      const actor = request && request.actor;
      // A missing actor must not produce an unauthenticated audit identity.
      if (!actor || typeof actor.userId !== 'string' || !actor.userId.trim() ||
          !['STUDENT', 'TA'].includes(actor.accountType)) return UNAVAILABLE;
      userId = actor.userId;
      startedAt = now();
      if (!state.enabled) {
        outcome = 'DISABLED';
        return UNAVAILABLE;
      }
      // Validate the content before reserving capacity (spec R4, R5), so a request that can
      // never reach the provider does not use up the user's or the shared global quota.
      const content = definition.buildUserContent(request.input);
      if (typeof content !== 'string' || !content.trim()) return UNAVAILABLE;
      const redacted = redactAndCap(content, definition.maxInputChars);
      if (!redacted.ok) {
        outcome = 'INPUT_TOO_LARGE';
        return { ok: false, code: 'AI_INPUT_TOO_LARGE' };
      }
      const reservation = await limiter.reserve(userId);
      if (!reservation || reservation.ok !== true) {
        if (reservation && reservation.code === 'AI_RATE_LIMITED') {
          outcome = 'RATE_LIMITED';
          return { ok: false, code: 'AI_RATE_LIMITED' };
        }
        return UNAVAILABLE;
      }
      const messages = buildMessages({ systemPrompt: definition.systemPrompt, content: redacted.content });
      const reply = await provider.send({ messages, maxOutputTokens: definition.maxOutputTokens });
      attempts = Number.isSafeInteger(reply && reply.attempts) && reply.attempts >= 0 ? reply.attempts : 0;
      if (!reply || reply.ok !== true) {
        if (reply && reply.category === 'TIMEOUT') outcome = 'TIMEOUT';
        return UNAVAILABLE;
      }
      providerUsage = reply.usage;
      const parsed = parseModelOutput(reply.response, definition.parse, request.input);
      outcome = parsed.ok ? 'SUCCESS' : 'INVALID_OUTPUT';
      return parsed;
    } catch {
      // Collaborator exceptions can contain prompts, credentials or output.
      // Never forward or log the exception.
      return UNAVAILABLE;
    } finally {
      if (definition && userId && startedAt !== undefined) {
        try {
          await usage.record({
            userId, feature: definition.feature, outcome, attempts,
            latencyMs: Math.max(0, now() - startedAt), usage: providerUsage,
          });
        } catch { /* Audit outages must not change the result. */ }
      }
    }
  }

  return Object.freeze({ enabled: state.enabled, register: registry.register, run });
}

module.exports = { createAiGateway };
