'use strict';

// Fix Note Drafter feature definition (spec ai-ta-assist v0.2, R1; scenarios 3, 4).
// The system prompt is fixed text. All ticket text is untrusted data and only reaches the
// provider through buildUserContent. Names, emails, user IDs, ticketId, repoUrl, and
// repoFilePaths are never read here, so they can never be sent.

const MAX_INPUT_CHARS = 16000;
const MAX_OUTPUT_TOKENS = 700;
const DRAFT_MAX_CHARS = 2000;

const SYSTEM_PROMPT = [
  'Write a short, factual resolution note for a course help-desk ticket.',
  'Cover the problem, the cause, and the fix or the concept involved.',
  'Keep the note to at most four short sentences.',
  'Write in plain text only, with no Markdown or HTML, and do not use any person\'s name.',
  'Do not add information beyond what the ticket contains.',
  'Write in the present tense, as a note for the TA to review and confirm; never claim that the problem "was resolved".',
  'State only causes that the ticket content supports.',
  'If the cause is unclear, say what the TA should check instead of guessing.',
  'Do not offer explanations hedged with words such as "likely" or "probably".',
  'Do not explain how output is displayed or rendered unless the ticket states it.',
  'Describe only what the ticket reports. If the ticket says how output appears on screen (such as HTML or script text shown literally), restate that observation and tell the TA to check it, without naming a possible cause such as XSS, sanitization, escaping, or filtering, unless the ticket itself states that cause.',
  'For anything the ticket leaves unexplained, say what the TA should check.',
  'Name only files, tools, libraries, settings, and places that appear in the ticket; do not mention any other framework, tool, or setting.',
  'Each thing you ask the TA to check must be something the ticket mentions, such as a file, a line, a setting, or the reported output, and never a guessed cause.',
  'Before replying, reread your note and delete any component, tool, or place the ticket does not mention (such as a server, browser console, framework, or security policy) and any check that names a cause the ticket does not state.',
  'Reply with exactly one JSON object of the form {"draft": "<the resolution note>"}.',
].join('\n');

function text(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function timeOf(value) {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function roleLabel(authorRole) {
  return authorRole === 'TA' ? 'TA' : 'STUDENT';
}

function buildUserContent(input) {
  const ticket = input && typeof input === 'object' ? input : {};
  const tags = Array.isArray(ticket.conceptTags) ? ticket.conceptTags.map(text).join(', ') : '';
  const files = Array.isArray(ticket.files) ? ticket.files : [];
  const replies = (Array.isArray(ticket.replies) ? ticket.replies : [])
    .map((reply, index) => ({ reply: reply || {}, index }))
    .sort((a, b) => timeOf(a.reply.createdAt) - timeOf(b.reply.createdAt) || a.index - b.index)
    .map((entry) => entry.reply);

  const lines = [
    `Title: ${text(ticket.title)}`,
    `Language: ${text(ticket.language)}`,
    `Concept tags: ${tags}`,
    `Error output: ${text(ticket.errorOutput)}`,
    `Expected behaviour: ${text(ticket.expectedBehaviour)}`,
    `Actual behaviour: ${text(ticket.actualBehaviour)}`,
    `What was attempted: ${text(ticket.attempted)}`,
    '',
    'Files:',
  ];
  files.forEach((file) => {
    lines.push(`File: ${text(file && file.name)}`, text(file && file.content), '');
  });
  lines.push('Replies (oldest first):');
  replies.forEach((reply) => {
    lines.push(`[${roleLabel(reply.authorRole)}] ${text(reply.message)}`);
  });
  return lines.join('\n');
}

function parse(output) {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) return { ok: false };
  const keys = Object.keys(output);
  if (keys.length !== 1 || keys[0] !== 'draft' || typeof output.draft !== 'string') return { ok: false };
  const draft = output.draft.trim();
  if (draft.length < 1 || draft.length > DRAFT_MAX_CHARS) return { ok: false };
  return { ok: true, data: { draft } };
}

const FIX_NOTE_DRAFTER = Object.freeze({
  feature: 'FIX_NOTE_DRAFTER',
  systemPrompt: SYSTEM_PROMPT,
  buildUserContent,
  maxInputChars: MAX_INPUT_CHARS,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  parse,
});

module.exports = { FIX_NOTE_DRAFTER };
