// Shared helpers for the TA AI-assist endpoints (spec ai-ta-assist v0.2, R4, R5; scenarios 6, 7, 9).
// The draft and insights routes and features import these; they must not redefine them.
const { isEmptyBody } = require('./ta-claims');
const { INVALID_MESSAGE } = require('./constants');

const AI_ERRORS = Object.freeze({
  AI_UNAVAILABLE: {
    status: 503,
    FIX_NOTE_DRAFTER: 'AI help is unavailable right now. You can still write the note yourself.',
    QUEUE_INSIGHTS: 'Queue insights are unavailable right now.',
  },
  AI_RATE_LIMITED: {
    status: 429,
    FIX_NOTE_DRAFTER: 'AI limit reached. Please try again in a minute.',
    QUEUE_INSIGHTS: 'AI limit reached. Please try again in a minute.',
  },
  AI_INPUT_TOO_LARGE: {
    status: 422,
    FIX_NOTE_DRAFTER: 'This ticket is too long for an AI draft.',
    QUEUE_INSIGHTS: 'The queue is too large to summarise.',
  },
  AI_INVALID_OUTPUT: {
    status: 502,
    FIX_NOTE_DRAFTER: 'The AI reply could not be used. Please try again or write the note yourself.',
    QUEUE_INSIGHTS: 'The AI reply could not be used. Please try again.',
  },
});

const ERROR_SUMMARY_MAX = 160;

/** Maps a gateway error code to `{ status, body: { code, message } }`; no provider detail is ever included. */
function toAiErrorResponse(code, feature) {
  const row = Object.prototype.hasOwnProperty.call(AI_ERRORS, code) ? AI_ERRORS[code] : AI_ERRORS.AI_UNAVAILABLE;
  const resolvedCode = row === AI_ERRORS[code] ? code : 'AI_UNAVAILABLE';
  const message = feature === 'QUEUE_INSIGHTS' ? row.QUEUE_INSIGHTS : row.FIX_NOTE_DRAFTER;
  return { status: row.status, body: { code: resolvedCode, message } };
}

/** Aliases `T1`..`Tn` in the order given, mapped to the ticket records. */
function buildAliasMap(tickets) {
  const map = new Map();
  (tickets || []).forEach((ticket, index) => map.set(`T${index + 1}`, ticket));
  return map;
}

/**
 * Maps model aliases back to `{ ticketId, title }`, dropping unknown aliases and repeats (the first
 * group wins) and removing groups left empty. Model text can never add a ticket id.
 */
function cleanInsightGroups(groups, aliasMap) {
  const used = new Set();
  const cleaned = [];
  (groups || []).forEach((group) => {
    const tickets = [];
    ((group && group.aliases) || []).forEach((alias) => {
      if (typeof alias !== 'string' || used.has(alias) || !aliasMap.has(alias)) return;
      used.add(alias);
      const record = aliasMap.get(alias);
      tickets.push({ ticketId: record.ticketId, title: record.title });
    });
    if (tickets.length > 0) cleaned.push({ label: group.label, kind: group.kind, summary: group.summary, tickets });
  });
  return cleaned;
}

/** The first non-empty line of the error output, trimmed and capped at 160 characters. */
function errorSummary(errorOutput) {
  if (typeof errorOutput !== 'string') return '';
  const line = errorOutput.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  return line ? line.slice(0, ERROR_SUMMARY_MAX) : '';
}

/** Express middleware: the POST body must be absent or `{}` (same rule as the claim endpoints). */
function requireEmptyJsonBody(req, res, next) {
  if (!isEmptyBody(req.body, req.headers)) {
    return res.status(400).json({ message: INVALID_MESSAGE });
  }
  return next();
}

module.exports = { toAiErrorResponse, buildAliasMap, cleanInsightGroups, errorSummary, requireEmptyJsonBody };
