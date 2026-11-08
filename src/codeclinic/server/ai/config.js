// AI gateway configuration (spec workflow/specs/ai-gateway.md v0.1, R2).
// Pure: reads only the env object passed in, never logs, never throws.
// The disabled reason names variables and rules only; it never echoes values.

const DEFAULT_GLOBAL_LIMIT_PER_MINUTE = 40;
const MIN_GLOBAL_LIMIT_PER_MINUTE = 1;
const MAX_GLOBAL_LIMIT_PER_MINUTE = 45;

const API_KEY_PATTERN = /^[\x21-\x7e]+$/; // printable ASCII, no whitespace or control characters
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const LIMIT_PATTERN = /^[0-9]+$/;

function isUnset(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function checkApiKey(value) {
  if (isUnset(value)) return { problem: 'missing' };
  if (typeof value !== 'string' || !API_KEY_PATTERN.test(value)) return { problem: 'malformed' };
  return { value };
}

function checkBaseUrl(value) {
  if (isUnset(value)) return { problem: 'missing' };
  if (typeof value !== 'string') return { problem: 'malformed' };
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return { problem: 'malformed' };
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !url.pathname.endsWith('/v1')) {
    return { problem: 'malformed' };
  }
  return { value: `${url.origin}${url.pathname}` };
}

function checkModel(value) {
  if (isUnset(value)) return { problem: 'missing' };
  if (typeof value !== 'string' || !MODEL_PATTERN.test(value.trim())) return { problem: 'malformed' };
  return { value: value.trim() };
}

function checkGlobalLimit(value) {
  if (isUnset(value)) return { value: DEFAULT_GLOBAL_LIMIT_PER_MINUTE };
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !LIMIT_PATTERN.test(text.trim())) return { problem: 'malformed' };
  const limit = Number(text.trim());
  if (!Number.isSafeInteger(limit) || limit < MIN_GLOBAL_LIMIT_PER_MINUTE || limit > MAX_GLOBAL_LIMIT_PER_MINUTE) {
    return { problem: 'out of range (1-45)' };
  }
  return { value: limit };
}

function disabled(problems) {
  const reason = `AI gateway disabled: ${problems.map(([name, problem]) => `${name} ${problem}`).join('; ')}.`;
  return Object.freeze({
    enabled: false,
    reason,
    invalidVariables: Object.freeze(problems.map(([name]) => name)),
  });
}

// Returns either
//   { enabled: true, config: { baseUrl, model, globalLimitPerMinute, apiKey } }
// or
//   { enabled: false, reason, invalidVariables }
// All returned objects are frozen. `config.apiKey` is non-enumerable so the
// config cannot leak the key through JSON.stringify, spread, or Object.keys.
function loadAiConfig(env) {
  const source = env && typeof env === 'object' ? env : {};
  const checks = [
    ['SOCLAAS_API_KEY', checkApiKey(source.SOCLAAS_API_KEY)],
    ['SOCLAAS_BASE_URL', checkBaseUrl(source.SOCLAAS_BASE_URL)],
    ['SOCLAAS_MODEL', checkModel(source.SOCLAAS_MODEL)],
    ['AI_GLOBAL_LIMIT_PER_MINUTE', checkGlobalLimit(source.AI_GLOBAL_LIMIT_PER_MINUTE)],
  ];
  const problems = checks.filter(([, result]) => result.problem).map(([name, result]) => [name, result.problem]);
  if (problems.length > 0) return disabled(problems);

  const [apiKey, baseUrl, model, globalLimitPerMinute] = checks.map(([, result]) => result.value);
  const config = { baseUrl, model, globalLimitPerMinute };
  Object.defineProperty(config, 'apiKey', { value: apiKey, enumerable: false });
  return Object.freeze({ enabled: true, config: Object.freeze(config) });
}

module.exports = {
  loadAiConfig,
  DEFAULT_GLOBAL_LIMIT_PER_MINUTE,
  MIN_GLOBAL_LIMIT_PER_MINUTE,
  MAX_GLOBAL_LIMIT_PER_MINUTE,
};
