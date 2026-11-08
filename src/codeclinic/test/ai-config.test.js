const {
  loadAiConfig,
  DEFAULT_GLOBAL_LIMIT_PER_MINUTE,
  MAX_GLOBAL_LIMIT_PER_MINUTE,
} = require('../server/ai/config');

const FAKE_KEY = 'test-key-not-real';
const validEnv = Object.freeze({
  SOCLAAS_API_KEY: FAKE_KEY,
  SOCLAAS_BASE_URL: 'https://soclaas-api.example.test/v1',
  SOCLAAS_MODEL: 'fake-model-1',
});

function withEnv(overrides) {
  const env = { ...validEnv, ...overrides };
  Object.keys(env).forEach((name) => env[name] === undefined && delete env[name]);
  return env;
}

function expectDisabled(result, variable) {
  expect(result.enabled).toBe(false);
  expect(result.config).toBeUndefined();
  expect(result.invalidVariables).toContain(variable);
  expect(result.reason).toContain(variable);
  expect(result.reason).not.toContain(FAKE_KEY);
  expect(JSON.stringify(result)).not.toContain(FAKE_KEY);
  expect(Object.isFrozen(result)).toBe(true);
}

describe('loadAiConfig valid configuration', () => {
  test('returns a frozen enabled config with the default global limit', () => {
    const result = loadAiConfig(validEnv);
    expect(result.enabled).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.config).toEqual({
      baseUrl: 'https://soclaas-api.example.test/v1',
      model: 'fake-model-1',
      globalLimitPerMinute: 40,
    });
    expect(result.config.apiKey).toBe(FAKE_KEY);
    expect(DEFAULT_GLOBAL_LIMIT_PER_MINUTE).toBe(40);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.config)).toBe(true);
  });

  test('accepts the production base URL', () => {
    const result = loadAiConfig(withEnv({ SOCLAAS_BASE_URL: 'https://soclaas-api.comp.nus.edu.sg/v1' }));
    expect(result.enabled).toBe(true);
    expect(result.config.baseUrl).toBe('https://soclaas-api.comp.nus.edu.sg/v1');
  });

  test('accepts global limits at both bounds and trims surrounding whitespace', () => {
    expect(loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: '1' })).config.globalLimitPerMinute).toBe(1);
    expect(loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: '45' })).config.globalLimitPerMinute).toBe(45);
    expect(loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: ' 30 ' })).config.globalLimitPerMinute).toBe(30);
    expect(MAX_GLOBAL_LIMIT_PER_MINUTE).toBe(45);
  });

  test('treats an empty optional global limit as the default', () => {
    expect(loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: '' })).config.globalLimitPerMinute).toBe(40);
  });

  test('does not expose the key through serialization, spread, or keys', () => {
    const { config } = loadAiConfig(validEnv);
    expect(JSON.stringify(config)).not.toContain(FAKE_KEY);
    expect(JSON.stringify(loadAiConfig(validEnv))).not.toContain(FAKE_KEY);
    expect({ ...config }.apiKey).toBeUndefined();
    expect(Object.keys(config)).not.toContain('apiKey');
  });

  test('ignores unrelated variables and does not mutate the env', () => {
    const env = withEnv({ OTHER: 'x' });
    const snapshot = { ...env };
    const result = loadAiConfig(env);
    expect(result.enabled).toBe(true);
    expect(Object.keys(result.config).sort()).toEqual(['baseUrl', 'globalLimitPerMinute', 'model']);
    expect(env).toEqual(snapshot);
  });
});

describe('loadAiConfig missing configuration', () => {
  test.each(['SOCLAAS_API_KEY', 'SOCLAAS_BASE_URL', 'SOCLAAS_MODEL'])('%s missing disables the gateway', (name) => {
    expectDisabled(loadAiConfig(withEnv({ [name]: undefined })), name);
    expectDisabled(loadAiConfig(withEnv({ [name]: '' })), name);
    expectDisabled(loadAiConfig(withEnv({ [name]: '   ' })), name);
  });

  test('an empty, missing, or non-object env disables the gateway without throwing', () => {
    for (const env of [{}, undefined, null, 'SOCLAAS_API_KEY=x']) {
      const result = loadAiConfig(env);
      expect(result.enabled).toBe(false);
      expect(result.invalidVariables).toEqual(['SOCLAAS_API_KEY', 'SOCLAAS_BASE_URL', 'SOCLAAS_MODEL']);
    }
  });

  test('reports every problem in one reason that names variables only', () => {
    const result = loadAiConfig({ SOCLAAS_API_KEY: FAKE_KEY, SOCLAAS_BASE_URL: 'http://insecure.example.test/v1' });
    expect(result.reason).toBe(
      'AI gateway disabled: SOCLAAS_BASE_URL malformed; SOCLAAS_MODEL missing.',
    );
    expect(result.reason).not.toContain('insecure.example.test');
  });
});

describe('loadAiConfig malformed configuration', () => {
  test.each([
    ['contains a space', 'test key-not-real'],
    ['contains a newline', 'test-key-not-real\nX-Injected: 1'],
    ['is not a string', 12345],
  ])('SOCLAAS_API_KEY that %s disables the gateway without echoing the key', (_label, value) => {
    const result = loadAiConfig(withEnv({ SOCLAAS_API_KEY: value }));
    expectDisabled(result, 'SOCLAAS_API_KEY');
    expect(result.reason).not.toContain(String(value));
  });

  test.each([
    'http://soclaas-api.example.test/v1',
    'https://soclaas-api.example.test',
    'https://soclaas-api.example.test/v1/',
    'https://soclaas-api.example.test/v2',
    'https://soclaas-api.example.test/v1?x=1',
    'https://soclaas-api.example.test/v1#frag',
    'https://user:pass@soclaas-api.example.test/v1',
    'not a url',
  ])('SOCLAAS_BASE_URL %s disables the gateway', (value) => {
    const result = loadAiConfig(withEnv({ SOCLAAS_BASE_URL: value }));
    expectDisabled(result, 'SOCLAAS_BASE_URL');
    expect(result.reason).toBe('AI gateway disabled: SOCLAAS_BASE_URL malformed.');
  });

  test.each(['model with spaces', 'model\nnext', '-leading-dash', 'x'.repeat(129)])(
    'SOCLAAS_MODEL %j disables the gateway',
    (value) => {
      expectDisabled(loadAiConfig(withEnv({ SOCLAAS_MODEL: value })), 'SOCLAAS_MODEL');
    },
  );

  test.each(['abc', '40.5', '-5', '1e1', '0x10', '4 0'])('AI_GLOBAL_LIMIT_PER_MINUTE %j is malformed', (value) => {
    const result = loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: value }));
    expectDisabled(result, 'AI_GLOBAL_LIMIT_PER_MINUTE');
    expect(result.reason).toBe('AI gateway disabled: AI_GLOBAL_LIMIT_PER_MINUTE malformed.');
  });
});

describe('loadAiConfig out-of-range global limit', () => {
  test.each(['0', '46', '90', '1000'])('AI_GLOBAL_LIMIT_PER_MINUTE %s fails closed', (value) => {
    const result = loadAiConfig(withEnv({ AI_GLOBAL_LIMIT_PER_MINUTE: value }));
    expectDisabled(result, 'AI_GLOBAL_LIMIT_PER_MINUTE');
    expect(result.reason).toBe('AI gateway disabled: AI_GLOBAL_LIMIT_PER_MINUTE out of range (1-45).');
  });
});
