'use strict';

/**
 * Model output parsing (spec `workflow/specs/ai-gateway.md` v0.1, R9).
 *
 * `parseModelOutput(response, featureParse)` reads the first choice's
 * `message.content`, strips at most one Markdown code fence that surrounds the
 * whole content, parses JSON, and passes the value only to the feature's
 * `parse`. It resolves to `{ ok: true, data }` or
 * `{ ok: false, code: 'AI_INVALID_OUTPUT' }` and never throws. No repair call
 * is made, and model output is never rendered or executed here.
 */

const AI_INVALID_OUTPUT = 'AI_INVALID_OUTPUT';
const INVALID = Object.freeze({ ok: false, code: AI_INVALID_OUTPUT });

const SURROUNDING_FENCE = /^```[A-Za-z0-9_+-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/;

function extractContent(response) {
  try {
    const choice = response && Array.isArray(response.choices) ? response.choices[0] : undefined;
    const content = choice && choice.message ? choice.message.content : undefined;
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}

/** Removes one fence only when it encloses the entire (trimmed) content. */
function stripCodeFence(content) {
  const trimmed = content.trim();
  const match = SURROUNDING_FENCE.exec(trimmed);
  return match ? match[1] : trimmed;
}

function parseModelOutput(response, featureParse, requestContext) {
  if (typeof featureParse !== 'function') return INVALID;
  const content = extractContent(response);
  if (content === null) return INVALID;

  let value;
  try {
    value = JSON.parse(stripCodeFence(content));
  } catch {
    return INVALID;
  }

  let result;
  try {
    // Keep the original provider text and trusted caller context available to
    // feature policies. Existing parsers may ignore the second argument.
    result = featureParse(value, { rawContent: content, requestContext });
  } catch {
    return INVALID;
  }
  if (result === null || typeof result !== 'object' || result.ok !== true || !('data' in result)) {
    return INVALID;
  }
  return { ok: true, data: result.data };
}

module.exports = {
  AI_INVALID_OUTPUT,
  extractContent,
  parseModelOutput,
  stripCodeFence,
};
