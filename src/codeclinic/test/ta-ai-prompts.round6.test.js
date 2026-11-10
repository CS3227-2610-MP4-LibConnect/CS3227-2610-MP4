// Improvement round 6 (T26): always state a concrete fix.
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');

describe('FIX_NOTE_DRAFTER system prompt (T26)', () => {
  const prompt = FIX_NOTE_DRAFTER.systemPrompt;
  const lines = prompt.split('\n');
  const fixLine =
    'Always state a concrete fix the student can apply; the limits on names and the final check apply to the problem, the cause, and the checks, not to the fix, which may name a standard language feature or a common library function even if the ticket does not mention it.';
  const selfCheck =
    'Before replying, reread your note and delete any component, tool, or place the ticket does not mention (such as a server, browser console, framework, or security policy) and any check that names a cause the ticket does not state.';
  const reply = 'Reply with exactly one JSON object of the form {"draft": "<the resolution note>"}.';

  test('has the fix line exactly once, directly before the self-check', () => {
    expect(lines.filter((l) => l === fixLine)).toHaveLength(1);
    expect(lines.indexOf(fixLine)).toBe(lines.indexOf(selfCheck) - 1);
  });

  test('keeps the self-check second-last and the reply line last', () => {
    expect(lines[lines.length - 1]).toBe(reply);
    expect(lines[lines.length - 2]).toBe(selfCheck);
  });

  test('keeps earlier rounds key lines', () => {
    expect(prompt).toContain('Cover the problem, the cause, and the fix or the concept involved.');
    expect(prompt).toContain(
      'Name only files, tools, libraries, settings, and places that appear in the ticket; do not mention any other framework, tool, or setting.',
    );
    expect(prompt).toContain(
      'Each thing you ask the TA to check must be something the ticket mentions, such as a file, a line, a setting, or the reported output, and never a guessed cause.',
    );
    expect(prompt).toMatch(/Describe only what the ticket reports/);
    expect(prompt).toMatch(/For anything the ticket leaves unexplained, say what the TA should check/);
    expect(prompt).toMatch(/State only causes that the ticket content supports/);
    expect(prompt).toMatch(/Do not offer explanations hedged with words such as "likely" or "probably"/);
  });

  test('is a fixed string that carries no ticket text', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt).not.toMatch(/\$\{|undefined|\[object/);
  });
});
