'use strict';

const { ERROR_EXPLAINER, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS, parse, serializeInput, registerStudentTicketHelp } = require('../server/ai/student-ticket-help');
const { createAiGateway } = require('../server/ai/gateway');

function fakeStudentGateway(content) {
  const transport = { send: jest.fn(async () => ({ ok: true, attempts: 1, response: { choices: [{ message: { content } }] } })) };
  const gateway = createAiGateway({
    env: { SOCLAAS_API_KEY: 'synthetic-test-key', SOCLAAS_BASE_URL: 'https://provider.invalid/v1', SOCLAAS_MODEL: 'fake-model' },
    transport,
    rateLimiter: { reserve: jest.fn(async () => ({ ok: true })) },
    usageStore: { record: jest.fn(async () => {}) },
    logger: { info: jest.fn() },
  });
  registerStudentTicketHelp(gateway);
  return { gateway, transport };
}

describe('Student ticket help feature policy', () => {
  test('uses fixed, bounded gateway policy and serializes every draft field verbatim', () => {
    const draft = { title: '', language: '', expectedBehaviour: '', actualBehaviour: '', attempted: '', errorOutput: '', conceptTags: '', files: [{ filename: 'a.js', content: 'token = ghp_12345678901234567890' }], repoUrl: '', repoFilePaths: '' };
    expect(ERROR_EXPLAINER.feature).toBe('ERROR_EXPLAINER');
    expect(ERROR_EXPLAINER.maxInputChars).toBe(MAX_INPUT_CHARS);
    expect(ERROR_EXPLAINER.maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
    expect(serializeInput({ page: 'create', question: 'Help', draft })).toContain('"draft":');
    expect(serializeInput({ page: 'create', question: 'Help', draft })).toContain('"expectedBehaviour":""');
    expect(ERROR_EXPLAINER.systemPrompt).not.toContain('student-1');
  });

  test('accepts valid hint, clarification, refusal and create refinement shapes', () => {
    expect(parse({ type: 'HINT', concept: 'Lookup', explanation: 'A lookup finds a value.', hints: ['Check the key.'] }).ok).toBe(true);
    expect(parse({ type: 'CLARIFICATION', question: 'What value did you expect?' }).ok).toBe(true);
    expect(parse({ type: 'REFUSAL', message: 'I can give a hint instead.' }).ok).toBe(true);
    expect(parse({ type: 'REFINEMENT', suggestions: [{ field: 'expectedBehaviour', suggestion: 'State the expected result.' }] }).ok).toBe(true);
  });

  test.each([
    { type: 'HINT', concept: 'Lookup', explanation: 'Brief.', hints: ['Check the key.'], extra: true },
    { type: 'HINT', concept: 'Lookup', explanation: 'Brief.', hints: ['Check the key.'], code: 'print(1)' },
    { type: 'HINT', concept: 'Lookup', explanation: 'Here is the complete solution.', hints: ['Check the key.'] },
    { type: 'HINT', concept: 'Lookup', explanation: 'Brief.', hints: ['token = abcdefghijk'] },
    { type: 'REFINEMENT', suggestions: [{ field: 'unknown', suggestion: 'Clarify this.' }] },
  ])('rejects unsafe or inexact output', (value) => expect(parse(value).ok).toBe(false));

  test('detail parser rejects create-only refinement', () => {
    expect(parse({ type: 'REFINEMENT', suggestions: [{ field: 'title', suggestion: 'Clarify the title.' }] }, { page: 'detail' }).ok).toBe(false);
  });

  test('create wording request has exact schema guidance and accepts a grounded refinement', async () => {
    const reply = { type: 'REFINEMENT', suggestions: [{ field: 'expectedBehaviour', suggestion: 'State the expected result for an empty lookup.' }] };
    const { gateway, transport } = fakeStudentGateway(JSON.stringify(reply));
    const input = { page: 'create', question: 'improve ticket wording', draft: { expectedBehaviour: 'Lookup should handle an empty input.' } };
    expect(await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input }))
      .toEqual({ ok: true, data: reply });
    const systemPrompt = transport.send.mock.calls[0][0].messages[0].content;
    for (const shape of ['HINT', 'REFINEMENT', 'CLARIFICATION', 'REFUSAL']) expect(systemPrompt).toContain(`"type":"${shape}"`);
    for (const field of ['title', 'language', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'errorOutput', 'conceptTags', 'filename', 'repoUrl', 'repoFilePaths'])
      expect(systemPrompt).toContain(field);
    expect(systemPrompt).toContain('1-10 suggestions');
    expect(systemPrompt).toContain('64 code units');
    expect(systemPrompt).toContain('no Markdown fence');
  });

  test('redacts the complete create draft and detail reply context before fake-provider transport', async () => {
    const secretCases = [
      'learner@example.invalid',
      'ghp_12345678901234567890',
      'AKIA1234567890ABCDEF',
      'Bearer syntheticBearerToken123456',
      '-----BEGIN PRIVATE KEY-----\nsynthetic-private-key-material\n-----END PRIVATE KEY-----',
    ];
    const draft = {
      title: 'Lookup timeout', language: 'JavaScript', expectedBehaviour: 'Show a result', actualBehaviour: 'No result',
      attempted: 'Check the key', errorOutput: `token = ${secretCases[1]}`, conceptTags: 'maps',
      files: [{ filename: 'lookup.js', content: `contact ${secretCases[0]}\n${secretCases[4]}` }],
      repoUrl: '', repoFilePaths: 'src/lookup.js',
    };
    const create = fakeStudentGateway('{"type":"CLARIFICATION","question":"Which key did you check?"}');
    const createResult = await create.gateway.run({
      feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' },
      input: { page: 'create', question: `Check ${secretCases[2]}`, history: [{ role: 'STUDENT', text: secretCases[3] }], draft },
    });
    expect(createResult.ok).toBe(true);
    const createContent = JSON.parse(create.transport.send.mock.calls[0][0].messages[1].content.split('<<<UNTRUSTED_CONTENT_BEGIN>>>')[1].split('<<<UNTRUSTED_CONTENT_END>>>')[0].trim());
    expect(createContent.draft).toMatchObject({ title: 'Lookup timeout', language: 'JavaScript', repoFilePaths: 'src/lookup.js' });
    for (const secret of secretCases) expect(create.transport.send.mock.calls[0][0].messages[1].content).not.toContain(secret);
    expect(create.transport.send.mock.calls[0][0].messages[1].content.match(/\[REDACTED\]/g).length).toBeGreaterThanOrEqual(5);

    const detail = fakeStudentGateway('{"type":"HINT","concept":"Lookup","explanation":"Check the matching key.","hints":["Compare the key exactly."]}');
    const detailResult = await detail.gateway.run({
      feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' },
      input: { page: 'detail', question: 'Why did the lookup fail?', ticket: {
        title: 'Lookup timeout', replies: [{ message: `TA note contains ${secretCases[0]} and ${secretCases[3]}` }, { message: `Student pasted ${secretCases[2]}` }],
      } },
    });
    expect(detailResult.ok).toBe(true);
    const providerContent = detail.transport.send.mock.calls[0][0].messages[1].content;
    expect(providerContent).toContain('Lookup timeout');
    expect(providerContent).toContain('[REDACTED]');
    for (const secret of secretCases) expect(providerContent).not.toContain(secret);
  });

  test('sparse create wording request accepts one clarifying question', async () => {
    const reply = { type: 'CLARIFICATION', question: 'What result did you expect from your program?' };
    const { gateway } = fakeStudentGateway(JSON.stringify(reply));
    expect(ERROR_EXPLAINER.systemPrompt).toContain('draft is too sparse');
    expect(await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'improve ticket wording', draft: {} } }))
      .toEqual({ ok: true, data: reply });
  });

  test.each([
    ['malformed JSON', '{"type":"CLARIFICATION","question":'],
    ['fenced JSON', '```json\n{"type":"CLARIFICATION","question":"What did you expect?"}\n```'],
    ['overlong suggestion', JSON.stringify({ type: 'REFINEMENT', suggestions: [{ field: 'title', suggestion: 'x'.repeat(65) }] })],
    ['unsafe suggestion', JSON.stringify({ type: 'REFINEMENT', suggestions: [{ field: 'title', suggestion: 'Copy and paste this complete solution.' }] })],
  ])('create wording request rejects %s with a safe error', async (_case, content) => {
    const { gateway, transport } = fakeStudentGateway(content);
    expect(await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'improve ticket wording', draft: {} } }))
      .toEqual({ ok: false, code: 'AI_INVALID_OUTPUT' });
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  test.each(['```json\n{"type":"REFUSAL","message":"I can give a hint instead."}\n```', 'Answer: {"type":"REFUSAL","message":"I can give a hint instead."}'])
    ('registered gateway rejects raw wrapped provider output', async (content) => {
      const { gateway, transport } = fakeStudentGateway(content);
      const result = await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'Help', draft: {} } });
      expect(result).toEqual({ ok: false, code: 'AI_INVALID_OUTPUT' });
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

  test('registered gateway uses trusted page context to reject detail refinements', async () => {
    const { gateway } = fakeStudentGateway('{"type":"REFINEMENT","suggestions":[{"field":"title","suggestion":"Clarify the title."}]}');
    const result = await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'detail', question: 'Help', ticket: {} } });
    expect(result).toEqual({ ok: false, code: 'AI_INVALID_OUTPUT' });
  });

  test.each([
    { family: 'JavaScript return', hint: 'return value' },
    { family: 'JavaScript await call', hint: 'await fetch(url)' },
    { family: 'JavaScript declaration', hint: 'const answer = solve()' },
    { family: 'JavaScript import', hint: "import { readFile } from 'fs'" },
    { family: 'JavaScript control flow', hint: 'if (ready) {' },
    { family: 'JavaScript exception', hint: 'throw new Error("bad")' },
    { family: 'JavaScript catch', hint: 'catch (error) {' },
    { family: 'JavaScript call', hint: 'console.log(value);' },
    { family: 'nested JavaScript call', hint: 'console.log(transform(value))' },
    { family: 'Python return', hint: 'return value' },
    { family: 'Python exception', hint: 'raise ValueError("bad")' },
    { family: 'Python break', hint: 'break' },
    { family: 'Python continue', hint: 'continue' },
    { family: 'Python pass', hint: 'pass' },
    { family: 'Python assert', hint: 'assert value is not None' },
    { family: 'Python exception handler', hint: 'except ValueError:' },
    { family: 'Python yield', hint: 'yield result' },
    { family: 'Python import', hint: 'from pathlib import Path' },
    { family: 'Python definition', hint: 'def solve(value):' },
    { family: 'Python loop', hint: 'for item in values:' },
    { family: 'Python lambda', hint: 'lambda x: x + 1' },
    { family: 'Python nested call', hint: 'map(filter(items))' },
    { family: 'assignment', hint: 'value = compute()' },
    { family: 'SQL select', hint: 'SELECT value FROM records' },
    { family: 'SQL select and filter', hint: 'select id from users where active = 1' },
    { family: 'SQL delete', hint: 'DELETE FROM users;' },
    { family: 'SQL insert', hint: 'INSERT INTO users (id) VALUES (1)' },
  ])
    ('registered gateway rejects $family syntax', async ({ hint }) => {
      const code = fakeStudentGateway(JSON.stringify({ type: 'HINT', concept: 'Loop', explanation: 'A loop repeats work.', hints: [hint] }));
      const codeResult = await code.gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'Help', draft: {} } });
      expect(codeResult).toEqual({ ok: false, code: 'AI_INVALID_OUTPUT' });
    });

  test.each([
    { family: 'function notation', hint: 'Use f(x) to describe the mapping.' },
    { family: 'complexity notation', hint: 'The runtime is O(n).' },
    { family: 'lambda explanation', hint: 'A lambda expression is an anonymous function.' },
    { family: 'return explanation', hint: 'The return value describes the result.' },
    { family: 'throw explanation', hint: 'A throw statement transfers control to an error handler.' },
    { family: 'raise explanation', hint: 'Raising an exception signals a failure.' },
    { family: 'throwing explanation', hint: 'Throwing an exception transfers control to an error handler.' },
    { family: 'raising explanation', hint: 'Raising errors helps signal invalid input.' },
    { family: 'break explanation', hint: 'The break statement exits the nearest loop.' },
    { family: 'pass explanation', hint: 'Pass can mark an intentionally empty block.' },
    { family: 'await explanation', hint: 'Awaiting a response can take time.' },
    { family: 'import explanation', hint: 'An import brings a module into scope.' },
    { family: 'select instruction', hint: 'Select the value from the array, then compare it.' },
  ])
    ('registered gateway accepts $family prose: $hint', async ({ hint }) => {
      const prose = fakeStudentGateway(JSON.stringify({ type: 'HINT', concept: 'Mapping', explanation: 'A mapping relates inputs to outputs.', hints: [hint] }));
      const result = await prose.gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'Help', draft: {} } });
      expect(result).toEqual({ ok: true, data: { type: 'HINT', concept: 'Mapping', explanation: 'A mapping relates inputs to outputs.', hints: [hint] } });
    });

  test('gateway refuses complete context overflow before transport', async () => {
    const overflow = fakeStudentGateway('{"type":"REFUSAL","message":"I can give a hint instead."}');
    const largeInput = { page: 'create', question: 'Help', draft: { title: 'x'.repeat(MAX_INPUT_CHARS) } };
    const overflowResult = await overflow.gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: largeInput });
    expect(overflowResult).toEqual({ ok: false, code: 'AI_INPUT_TOO_LARGE' });
    expect(overflow.transport.send).not.toHaveBeenCalled();
  });
});
