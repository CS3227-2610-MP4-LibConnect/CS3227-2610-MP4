// Improvement round 4 (T22): describe, don't diagnose, in the fixed Fix Note Drafter prompt.
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');

describe('FIX_NOTE_DRAFTER system prompt (T22)', () => {
  const prompt = FIX_NOTE_DRAFTER.systemPrompt;

  test('tells the model to describe only what the ticket reports', () => {
    expect(prompt).toMatch(/Describe only what the ticket reports/);
  });

  test('tells the model to restate on-screen output observations and ask the TA to check', () => {
    expect(prompt).toMatch(/HTML or script text shown literally/);
    expect(prompt).toMatch(/restate that observation and tell the TA to check it/);
  });

  test('forbids naming a possible cause such as XSS, sanitization, escaping or filtering', () => {
    expect(prompt).toMatch(/without naming a possible cause such as XSS, sanitization, escaping, or filtering/);
  });

  test('keeps the round 3 lines and the earlier instructions', () => {
    expect(prompt).toMatch(/Do not offer explanations hedged with words such as "likely" or "probably"/);
    expect(prompt).toMatch(/Do not explain how output is displayed or rendered unless the ticket states it/);
    expect(prompt).toMatch(/For anything the ticket leaves unexplained, say what the TA should check/);
    expect(prompt).toContain('resolution note');
    expect(prompt).toMatch(/at most four short sentences/);
    expect(prompt).toMatch(/present tense/);
    expect(prompt).toMatch(/only causes that the ticket content supports/);
    expect(prompt).toContain('{"draft": "<the resolution note>"}');
  });

  test('is a fixed string that carries no ticket text', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt).not.toMatch(/\$\{|undefined|\[object/);
  });
});
