// Improvement round 5 (T25): final self-check for outside details.
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');

describe('FIX_NOTE_DRAFTER system prompt (T25)', () => {
  const prompt = FIX_NOTE_DRAFTER.systemPrompt;
  const lines = prompt.split('\n');
  const selfCheck =
    'Before replying, reread your note and delete any component, tool, or place the ticket does not mention (such as a server, browser console, framework, or security policy) and any check that names a cause the ticket does not state.';
  const reply = 'Reply with exactly one JSON object of the form {"draft": "<the resolution note>"}.';

  test('has the self-check line, immediately before the reply line, which stays last', () => {
    expect(lines.filter((l) => l === selfCheck)).toHaveLength(1);
    expect(lines[lines.length - 1]).toBe(reply);
    expect(lines[lines.length - 2]).toBe(selfCheck);
  });

  test('keeps the T24 lines', () => {
    expect(prompt).toContain(
      'Name only files, tools, libraries, settings, and places that appear in the ticket; do not mention any other framework, tool, or setting.',
    );
    expect(prompt).toContain(
      'Each thing you ask the TA to check must be something the ticket mentions, such as a file, a line, a setting, or the reported output, and never a guessed cause.',
    );
  });

  test('keeps the T22/T23 and round 3 lines', () => {
    expect(prompt).toMatch(/Describe only what the ticket reports/);
    expect(prompt).toMatch(/restate that observation and tell the TA to check it/);
    expect(prompt).toMatch(/For anything the ticket leaves unexplained, say what the TA should check/);
    expect(prompt).toMatch(/State only causes that the ticket content supports/);
    expect(prompt).toMatch(/If the cause is unclear, say what the TA should check instead of guessing/);
    expect(prompt).toMatch(/Do not offer explanations hedged with words such as "likely" or "probably"/);
    expect(prompt).toMatch(/Do not explain how output is displayed or rendered unless the ticket states it/);
  });

  test('is a fixed string that carries no ticket text', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt).not.toMatch(/\$\{|undefined|\[object/);
  });
});
