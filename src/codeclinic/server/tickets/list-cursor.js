const { validateTicketId } = require('./validation');

const MAX_CURSOR_LENGTH = 512;

function timestampParts(timestamp) {
  if (!timestamp || !Number.isSafeInteger(timestamp.seconds) || timestamp.seconds < 0 ||
      !Number.isInteger(timestamp.nanoseconds) || timestamp.nanoseconds < 0 || timestamp.nanoseconds >= 1e9) return null;
  return { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds };
}

function encodeListCursor(view, boundary) {
  if (!['open', 'closed'].includes(view) || !boundary || !validateTicketId(boundary.ticketId)) return null;
  const parts = timestampParts(boundary.updatedAt);
  if (!parts) return null;
  const value = Buffer.from(JSON.stringify({ v: 1, view, ...parts, ticketId: boundary.ticketId }), 'utf8').toString('base64url');
  return value.length <= MAX_CURSOR_LENGTH ? value : null;
}

function decodeListCursor(value, view, Timestamp) {
  if (typeof value !== 'string' || value.length < 1 || value.length > MAX_CURSOR_LENGTH ||
      !/^[A-Za-z0-9_-]+$/.test(value) || !['open', 'closed'].includes(view)) return null;
  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    if (Buffer.from(json, 'utf8').toString('base64url') !== value) return null;
    const parsed = JSON.parse(json);
    if (!parsed || Object.keys(parsed).sort().join(',') !== 'nanoseconds,seconds,ticketId,v,view' ||
        parsed.v !== 1 || parsed.view !== view || !Number.isSafeInteger(parsed.seconds) || parsed.seconds < 0 ||
        !Number.isInteger(parsed.nanoseconds) || parsed.nanoseconds < 0 || parsed.nanoseconds >= 1e9 ||
        !validateTicketId(parsed.ticketId)) return null;
    return { updatedAt: new Timestamp(parsed.seconds, parsed.nanoseconds), ticketId: parsed.ticketId };
  } catch (error) {
    return null;
  }
}

module.exports = { MAX_CURSOR_LENGTH, encodeListCursor, decodeListCursor };
