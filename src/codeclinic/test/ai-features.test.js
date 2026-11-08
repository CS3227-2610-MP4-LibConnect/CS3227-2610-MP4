const {
  FEATURE_NAMES,
  FeatureDefinitionError,
  createFeatureRegistry,
  isAllowedFeatureName,
  validateFeatureDefinition,
} = require('../server/ai/features');

function fakeDefinition(overrides = {}) {
  return {
    feature: 'ERROR_EXPLAINER',
    systemPrompt: 'Explain the error in the ticket as JSON with an "explanation" string.',
    buildUserContent: (input) => String(input.text),
    maxInputChars: 4000,
    maxOutputTokens: 500,
    parse: (value) =>
      value && typeof value.explanation === 'string' ? { ok: true, data: { explanation: value.explanation } } : { ok: false },
    ...overrides,
  };
}

describe('AI feature registry', () => {
  test('allows exactly the three approved feature names', () => {
    expect(FEATURE_NAMES).toEqual(['ERROR_EXPLAINER', 'FIX_NOTE_DRAFTER', 'QUEUE_INSIGHTS']);
    expect(Object.isFrozen(FEATURE_NAMES)).toBe(true);
    FEATURE_NAMES.forEach((name) => expect(isAllowedFeatureName(name)).toBe(true));
    ['error_explainer', 'UNKNOWN', '', ' ERROR_EXPLAINER', null, undefined, 1, {}].forEach((name) =>
      expect(isAllowedFeatureName(name)).toBe(false)
    );
  });

  test('registers a valid definition and returns a frozen copy with only R3 fields', () => {
    const registry = createFeatureRegistry();
    const definition = fakeDefinition();
    const registered = registry.register(definition);
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.keys(registered).sort()).toEqual(
      ['buildUserContent', 'feature', 'maxInputChars', 'maxOutputTokens', 'parse', 'systemPrompt'].sort()
    );
    expect(registry.get('ERROR_EXPLAINER')).toBe(registered);
    expect(registry.has('ERROR_EXPLAINER')).toBe(true);
    expect(registry.names()).toEqual(['ERROR_EXPLAINER']);

    definition.systemPrompt = 'mutated later';
    expect(registry.get('ERROR_EXPLAINER').systemPrompt).not.toBe('mutated later');
  });

  test('registers every allowed feature independently', () => {
    const registry = createFeatureRegistry();
    FEATURE_NAMES.forEach((feature) => registry.register(fakeDefinition({ feature })));
    expect(registry.names().sort()).toEqual([...FEATURE_NAMES].sort());
  });

  test('rejects unknown and unregistered features on lookup without throwing', () => {
    const registry = createFeatureRegistry();
    registry.register(fakeDefinition());
    expect(registry.get('FIX_NOTE_DRAFTER')).toBeNull();
    expect(registry.get('UNKNOWN_FEATURE')).toBeNull();
    expect(registry.get('__proto__')).toBeNull();
    expect(registry.get('constructor')).toBeNull();
    expect(registry.get(undefined)).toBeNull();
    expect(registry.get({ feature: 'ERROR_EXPLAINER' })).toBeNull();
    expect(registry.has('UNKNOWN_FEATURE')).toBe(false);
  });

  test('rejects registration of an unknown feature name', () => {
    const registry = createFeatureRegistry();
    expect(() => registry.register(fakeDefinition({ feature: 'DELETE_ALL_TICKETS' }))).toThrow(FeatureDefinitionError);
    expect(registry.names()).toEqual([]);
  });

  test('rejects duplicate registration', () => {
    const registry = createFeatureRegistry();
    registry.register(fakeDefinition());
    expect(() => registry.register(fakeDefinition())).toThrow(/already registered/);
  });

  test('registries are isolated from each other', () => {
    const a = createFeatureRegistry();
    const b = createFeatureRegistry();
    a.register(fakeDefinition());
    expect(b.get('ERROR_EXPLAINER')).toBeNull();
  });

  test.each([
    ['non-object definition', null],
    ['array definition', []],
    ['missing systemPrompt', fakeDefinition({ systemPrompt: undefined })],
    ['empty systemPrompt', fakeDefinition({ systemPrompt: '   ' })],
    ['non-string systemPrompt', fakeDefinition({ systemPrompt: () => 'dynamic' })],
    ['missing buildUserContent', fakeDefinition({ buildUserContent: 'text' })],
    ['zero maxInputChars', fakeDefinition({ maxInputChars: 0 })],
    ['fractional maxInputChars', fakeDefinition({ maxInputChars: 10.5 })],
    ['string maxInputChars', fakeDefinition({ maxInputChars: '4000' })],
    ['negative maxOutputTokens', fakeDefinition({ maxOutputTokens: -1 })],
    ['infinite maxOutputTokens', fakeDefinition({ maxOutputTokens: Infinity })],
    ['missing parse', fakeDefinition({ parse: undefined })],
    ['client-chosen model field', fakeDefinition({ model: 'other-model' })],
    ['unexpected field', fakeDefinition({ tools: [] })],
  ])('rejects invalid definition: %s', (_label, definition) => {
    expect(validateFeatureDefinition(definition).ok).toBe(false);
    expect(() => createFeatureRegistry().register(definition)).toThrow(FeatureDefinitionError);
  });

  test('validation reasons do not echo field values', () => {
    const secretish = 'test-key-not-real-value';
    const result = validateFeatureDefinition(fakeDefinition({ systemPrompt: '', maxInputChars: secretish }));
    expect(result.ok).toBe(false);
    expect(result.reason).not.toContain(secretish);
    expect(() => createFeatureRegistry().register(fakeDefinition({ feature: secretish }))).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secretish) })
    );
  });

  test('a registered parse follows the documented { ok, data } | { ok: false } contract', () => {
    const registry = createFeatureRegistry();
    const { parse } = registry.register(fakeDefinition());
    expect(parse({ explanation: 'Null pointer' })).toEqual({ ok: true, data: { explanation: 'Null pointer' } });
    expect(parse({ explanation: 42 })).toEqual({ ok: false });
    expect(parse(null)).toEqual({ ok: false });
  });
});
