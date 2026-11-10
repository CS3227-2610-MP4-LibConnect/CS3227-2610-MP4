// Improvement round 4 follow-up (T23): keep a cause the ticket itself states.
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');

describe('FIX_NOTE_DRAFTER system prompt (T23)', () => {
  const prompt = FIX_NOTE_DRAFTER.systemPrompt;

  test('allows a cause that the ticket itself states', () => {
    expect(prompt).toMatch(/escaping, or filtering, unless the ticket itself states that cause\./);
  });

  test('keeps the T22 line', () => {
    expect(prompt).toMatch(/Describe only what the ticket reports/);
    expect(prompt).toMatch(/HTML or script text shown literally/);
    expect(prompt).toMatch(/restate that observation and tell the TA to check it/);
    expect(prompt).toMatch(/without naming a possible cause such as XSS, sanitization, escaping, or filtering/);
  });

  test('keeps the round 3 lines', () => {
    expect(prompt).toMatch(/Do not offer explanations hedged with words such as "likely" or "probably"/);
    expect(prompt).toMatch(/Do not explain how output is displayed or rendered unless the ticket states it/);
    expect(prompt).toMatch(/For anything the ticket leaves unexplained, say what the TA should check/);
  });

  test('is a fixed string that carries no ticket text', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt).not.toMatch(/\$\{|undefined|\[object/);
  });
});
