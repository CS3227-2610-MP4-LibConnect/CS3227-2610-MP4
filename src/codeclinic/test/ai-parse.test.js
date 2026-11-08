const { AI_INVALID_OUTPUT, extractContent, parseModelOutput, stripCodeFence } = require('../server/ai/parse');

const INVALID = { ok: false, code: AI_INVALID_OUTPUT };

function providerReply(content) {
  return { choices: [{ message: { role: 'assistant', content } }] };
}

const validateExplanation = (value) =>
  value && typeof value === 'object' && typeof value.explanation === 'string'
    ? { ok: true, data: { explanation: value.explanation } }
    : { ok: false };

let featureParse;
beforeEach(() => {
  featureParse = jest.fn(validateExplanation);
});

describe('AI output parsing', () => {
  test('accepts valid JSON content and returns the feature data', () => {
    expect(parseModelOutput(providerReply('{"explanation":"off by one"}'), featureParse)).toEqual({
      ok: true,
      data: { explanation: 'off by one' },
    });
    expect(featureParse).toHaveBeenCalledWith({ explanation: 'off by one' });
  });

  test('accepts surrounding whitespace', () => {
    expect(parseModelOutput(providerReply('  \n{"explanation":"x"}\n '), featureParse)).toMatchObject({ ok: true });
  });

  test.each([
    '```json\n{"explanation":"fenced"}\n```',
    '```\n{"explanation":"fenced"}\n```',
    '\n```JSON\r\n{"explanation":"fenced"}\r\n```\n',
    '```json\n{"explanation":"fenced"}```',
  ])('accepts one surrounding code fence: %j', (content) => {
    expect(parseModelOutput(providerReply(content), featureParse)).toEqual({ ok: true, data: { explanation: 'fenced' } });
  });

  test.each([
    'Here you go:\n```json\n{"explanation":"x"}\n```',
    '```json\n{"explanation":"x"}\n```\nHope this helps!',
    '```json\n```json\n{"explanation":"x"}\n```\n```',
    '```json\n{"explanation":"x"}\n```\n```json\n{"explanation":"y"}\n```',
  ])('rejects fenced JSON with extra text or a second fence: %j', (content) => {
    expect(parseModelOutput(providerReply(content), featureParse)).toEqual(INVALID);
    expect(featureParse).not.toHaveBeenCalled();
  });

  test.each([
    ['null response', null],
    ['no choices', {}],
    ['empty choices', { choices: [] }],
    ['choices not an array', { choices: { 0: { message: { content: '{}' } } } }],
    ['no message', { choices: [{}] }],
    ['missing content', { choices: [{ message: { role: 'assistant' } }] }],
    ['null content', providerReply(null)],
  ])('rejects %s', (_label, response) => {
    expect(parseModelOutput(response, featureParse)).toEqual(INVALID);
    expect(featureParse).not.toHaveBeenCalled();
  });

  test.each([
    ['number', 42],
    ['object', { explanation: 'x' }],
    ['array', ['{"explanation":"x"}']],
  ])('rejects non-string content (%s)', (_label, content) => {
    expect(parseModelOutput(providerReply(content), featureParse)).toEqual(INVALID);
    expect(featureParse).not.toHaveBeenCalled();
  });

  test.each(['', 'not json', '{"explanation": "x"', "{'explanation':'x'}", 'Sure! {"explanation":"x"}'])(
    'rejects non-JSON content: %j',
    (content) => {
      expect(parseModelOutput(providerReply(content), featureParse)).toEqual(INVALID);
      expect(featureParse).not.toHaveBeenCalled();
    }
  );

  test.each(['{"explanation":42}', '{"other":"x"}', '[]', '"just a string"', 'null'])(
    'rejects schema-invalid JSON: %j',
    (content) => {
      expect(parseModelOutput(providerReply(content), featureParse)).toEqual(INVALID);
      expect(featureParse).toHaveBeenCalledTimes(1);
    }
  );

  test('treats a throwing or non-conforming feature parse as invalid output', () => {
    const reply = providerReply('{"explanation":"x"}');
    expect(
      parseModelOutput(reply, () => {
        throw new Error('boom');
      })
    ).toEqual(INVALID);
    for (const bad of [undefined, null, true, { ok: true }, { ok: 'yes', data: 1 }, Promise.resolve({ ok: true, data: 1 })]) {
      expect(parseModelOutput(reply, () => bad)).toEqual(INVALID);
    }
    expect(parseModelOutput(reply, undefined)).toEqual(INVALID);
  });

  test('uses only the first choice', () => {
    const response = {
      choices: [{ message: { content: 'not json' } }, { message: { content: '{"explanation":"second"}' } }],
    };
    expect(parseModelOutput(response, featureParse)).toEqual(INVALID);
  });

  test('a throwing getter on the response is invalid output, not an exception', () => {
    const response = {
      get choices() {
        throw new Error('hostile');
      },
    };
    expect(extractContent(response)).toBeNull();
    expect(parseModelOutput(response, featureParse)).toEqual(INVALID);
  });

  test('stripCodeFence removes only one whole-content fence', () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripCodeFence(' {"a":1} ')).toBe('{"a":1}');
    expect(stripCodeFence('text\n```json\n{"a":1}\n```')).toBe('text\n```json\n{"a":1}\n```');
  });
});
