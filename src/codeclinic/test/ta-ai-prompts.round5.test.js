// Improvement round 5 (T24): grounded checks, no outside details.
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');

describe('FIX_NOTE_DRAFTER system prompt (T24)', () => {
  const prompt = FIX_NOTE_DRAFTER.systemPrompt;

  test('names only things that appear in the ticket', () => {
    expect(prompt).toContain(
      'Name only files, tools, libraries, settings, and places that appear in the ticket; do not mention any other framework, tool, or setting.',
    );
  });

  test('checks must point at something the ticket mentions, never a guessed cause', () => {
    expect(prompt).toContain(
      'Each thing you ask the TA to check must be something the ticket mentions, such as a file, a line, a setting, or the reported output, and never a guessed cause.',
    );
  });

  test('keeps the round 1 lines', () => {
    expect(prompt).toContain('resolution note');
    expect(prompt).toMatch(/plain text only/);
    expect(prompt).toMatch(/Do not add information beyond what the ticket contains/);
    expect(prompt).toMatch(/present tense/);
    expect(prompt).toMatch(/for the TA to review and confirm/);
    expect(prompt).toContain('{"draft": "<the resolution note>"}');
  });

  test('keeps the round 3, 4 and 4b lines', () => {
    expect(prompt).toMatch(/State only causes that the ticket content supports/);
    expect(prompt).toMatch(/If the cause is unclear, say what the TA should check instead of guessing/);
    expect(prompt).toMatch(/Do not offer explanations hedged with words such as "likely" or "probably"/);
    expect(prompt).toMatch(/Do not explain how output is displayed or rendered unless the ticket states it/);
    expect(prompt).toMatch(/For anything the ticket leaves unexplained, say what the TA should check/);
    expect(prompt).toMatch(/Describe only what the ticket reports/);
    expect(prompt).toMatch(/restate that observation and tell the TA to check it/);
    expect(prompt).toMatch(/escaping, or filtering, unless the ticket itself states that cause\./);
  });

  test('is a fixed string that carries no ticket text', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt).not.toMatch(/\$\{|undefined|\[object/);
  });
});
