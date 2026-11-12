const express = require('express');
const { openFaqToken, TOKEN_MAX_LENGTH } = require('./faq-token');
const { TICKET_ID_PATTERN, isValidConceptTags } = require('./constants');

const MAX_QUERY_CODE_POINTS = 100;
const MAX_FAQ_TOKEN_LENGTH = TOKEN_MAX_LENGTH;
const MAX_CURSOR_VALUE_DEPTH = 8;
const MAX_CURSOR_VALUE_ITEMS = 100;
const MAX_CURSOR_VALUE_STRING_LENGTH = 2048;
const CURSOR_VALUE_TAG = '__faqCursorValueType';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
const SEARCH_KEYS = new Set(['q', 'field', 'cursor']);
const DETAIL_KEYS = new Set(['cursor']);

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return isRecord(value) && Object.keys(value).every((key) => allowed.has(key));
}

function exactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
}

function validTokenShape(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_FAQ_TOKEN_LENGTH && TOKEN_PATTERN.test(value);
}

function validTimestampParts(value) {
  return exactKeys(value, ['seconds', 'nanoseconds']) && Number.isSafeInteger(value.seconds) && value.seconds >= 0 &&
    Number.isInteger(value.nanoseconds) && value.nanoseconds >= 0 && value.nanoseconds < 1e9;
}

function validCursorBoundaryValue(value, depth = 0) {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= MAX_CURSOR_VALUE_STRING_LENGTH;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value) || depth >= MAX_CURSOR_VALUE_DEPTH) return false;
  if (validTimestampParts(value)) return true;
  switch (value[CURSOR_VALUE_TAG]) {
    case 'number':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'value']) && ['NaN', 'Infinity', '-Infinity'].includes(value.value);
    case 'geoPoint':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'latitude', 'longitude']) &&
        Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 &&
        Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180;
    case 'bytes':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'data']) && typeof value.data === 'string' &&
        value.data.length <= MAX_CURSOR_VALUE_STRING_LENGTH && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data);
    case 'reference':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'projectId', 'databaseId', 'path']) &&
        typeof value.projectId === 'string' && value.projectId.length > 0 && value.projectId.length <= 128 &&
        typeof value.databaseId === 'string' && value.databaseId.length > 0 && value.databaseId.length <= 128 &&
        typeof value.path === 'string' && value.path.length > 0 && value.path.length <= 1500 &&
        value.path.split('/').length % 2 === 0;
    case 'array':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'value']) && Array.isArray(value.value) &&
        value.value.length <= MAX_CURSOR_VALUE_ITEMS && value.value.every((item) => validCursorBoundaryValue(item, depth + 1));
    case 'map':
      return exactKeys(value, [CURSOR_VALUE_TAG, 'value']) && Array.isArray(value.value) &&
        value.value.length <= MAX_CURSOR_VALUE_ITEMS && value.value.every((entry) =>
          Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' &&
          entry[0].length <= MAX_CURSOR_VALUE_STRING_LENGTH && validCursorBoundaryValue(entry[1], depth + 1));
    default:
      return false;
  }
}

function validSearchCursor(payload) {
  return exactKeys(payload, ['v', 'createdAt', 'ticketId']) && payload.v === 1 &&
    validCursorBoundaryValue(payload.createdAt) && typeof payload.ticketId === 'string' && TICKET_ID_PATTERN.test(payload.ticketId);
}

function validFaqReference(payload) {
  return exactKeys(payload, ['v', 'ticketId']) && payload.v === 1 &&
    typeof payload.ticketId === 'string' && TICKET_ID_PATTERN.test(payload.ticketId);
}

function validReplyCursor(payload, ticketId) {
  return exactKeys(payload, ['v', 'ticketId', 'createdAt', 'replyId']) && payload.v === 1 &&
    payload.ticketId === ticketId && validCursorBoundaryValue(payload.createdAt) &&
    typeof payload.replyId === 'string' && TICKET_ID_PATTERN.test(payload.replyId);
}

function validQuery(query) {
  if (!hasOnlyKeys(query, SEARCH_KEYS) || typeof query.q !== 'string' || typeof query.field !== 'string' ||
      !['title', 'tags'].includes(query.field) || (query.cursor !== undefined && !validTokenShape(query.cursor))) return null;
  const normalizedQuery = query.q.trim();
  const codePointLength = Array.from(normalizedQuery).length;
  if (codePointLength < 1 || codePointLength > MAX_QUERY_CODE_POINTS) return null;
  return { query: normalizedQuery, field: query.field, cursor: query.cursor };
}

function serializeCreatedAt(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
}

async function authenticateStudent(req, res, { authenticateRequest, repository }) {
  const auth = await authenticateRequest(req, res);
  if (!auth) {
    res.status(401).json({ message: 'Authentication required.' });
    return null;
  }
  if (auth.accountType !== 'STUDENT') {
    res.status(403).json({ message: 'You do not have permission to do that.' });
    return null;
  }
  const studentId = auth.session && auth.session.userId;
  if (typeof studentId !== 'string' || typeof auth.idHash !== 'string') {
    res.status(401).json({ message: 'Authentication required.' });
    return null;
  }
  const account = await repository.getUserById(studentId);
  if (!account || account.userId !== studentId || account.accountStatus !== 'ACTIVE' || account.accountType !== 'STUDENT') {
    res.status(401).json({ message: 'Authentication required.' });
    return null;
  }
  if (account.mustChangePassword === true) {
    res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
    return null;
  }
  return { studentId, idHash: auth.idHash };
}

async function resolveReplySpeakers(replies, ticket) {
  const result = [];
  for (const reply of replies) {
    if (!reply || reply.ticketId !== ticket.ticketId || typeof reply.authorUserId !== 'string' ||
        typeof reply.message !== 'string') continue;
    const speaker = reply.authorUserId === ticket.studentId ? 'Student'
      : reply.authorUserId === ticket.claimedByTaId ? 'TA' : null;
    const createdAt = serializeCreatedAt(reply.createdAt);
    if (!speaker || createdAt === null) continue;
    result.push({ speaker, message: reply.message, createdAt });
    if (result.length === 50) break;
  }
  return result;
}

function createFaqRouter({ authenticateRequest, repository, store } = {}) {
  if (typeof authenticateRequest !== 'function' || !repository || typeof repository.getUserById !== 'function' ||
      !store || typeof store !== 'object') {
    throw new TypeError('Bug FAQ router dependencies are required.');
  }
  const router = express.Router();
  router.use('/faq', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/faq', async (req, res) => {
    try {
      const input = validQuery(req.query);
      if (!input) return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
      const auth = await authenticateStudent(req, res, { authenticateRequest, repository });
      if (!auth) return;
      if (input.cursor !== undefined) {
        const cursorPayload = await openFaqToken(input.cursor, {
          idHash: auth.idHash,
          studentId: auth.studentId,
          purpose: 'searchCursor',
          binding: { query: input.query.toLowerCase(), field: input.field },
        });
        if (!validSearchCursor(cursorPayload)) return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
      }
      if (typeof store.searchFaq !== 'function') throw new Error('Bug FAQ search store is unavailable.');
      const result = await store.searchFaq({
        idHash: auth.idHash,
        studentId: auth.studentId,
        query: input.query,
        field: input.field,
        cursor: input.cursor,
      });
      const tickets = Array.isArray(result && result.tickets) ? result.tickets.flatMap((ticket) => {
        if (!ticket || typeof ticket.title !== 'string' || !isValidConceptTags(ticket.conceptTags) || !validTokenShape(ticket.faqRef)) return [];
        return [{ title: ticket.title, conceptTags: ticket.conceptTags.slice(), faqRef: ticket.faqRef }];
      }) : [];
      const response = { tickets };
      if (result && result.nextCursor !== undefined && result.nextCursor !== null) {
        if (!validTokenShape(result.nextCursor)) throw new Error('Invalid Bug FAQ page boundary.');
        response.nextCursor = result.nextCursor;
      }
      return res.status(200).json(response);
    } catch (error) {
      if (error && error.code === 'INVALID_CURSOR') return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
      return res.status(503).json({ message: 'Ticket service is temporarily unavailable. Please try again.' });
    }
  });

  router.get('/faq/:faqRef', async (req, res) => {
    try {
      const faqRef = req.params.faqRef;
      if (!validTokenShape(faqRef)) return res.status(404).json({ message: 'FAQ result not found.' });
      if (!hasOnlyKeys(req.query, DETAIL_KEYS) ||
          (req.query.cursor !== undefined && !validTokenShape(req.query.cursor))) {
        return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
      }
      const auth = await authenticateStudent(req, res, { authenticateRequest, repository });
      if (!auth) return;
      const tokenContext = { idHash: auth.idHash, studentId: auth.studentId, purpose: 'faqRef', binding: {} };
      const referencePayload = await openFaqToken(faqRef, tokenContext);
      if (!validFaqReference(referencePayload)) return res.status(404).json({ message: 'FAQ result not found.' });
      if (req.query.cursor !== undefined) {
        const cursorPayload = await openFaqToken(req.query.cursor, {
          idHash: auth.idHash,
          studentId: auth.studentId,
          purpose: 'replyCursor',
          binding: { faqRef },
        });
        if (!validReplyCursor(cursorPayload, referencePayload.ticketId)) {
          return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
        }
      }
      if (typeof store.getFaqDetail !== 'function') throw new Error('Bug FAQ detail store is unavailable.');
      const result = await store.getFaqDetail(auth.studentId, faqRef, { cursor: req.query.cursor, idHash: auth.idHash });
      const ticket = result && result.ticket;
      if (!ticket || ticket.status !== 'RESOLVED' || ticket.ticketId !== referencePayload.ticketId ||
          typeof ticket.title !== 'string' || !isValidConceptTags(ticket.conceptTags) || typeof ticket.fixNote !== 'string') {
        return res.status(404).json({ message: 'FAQ result not found.' });
      }
      const replies = await resolveReplySpeakers(Array.isArray(result.replies) ? result.replies : [], ticket);
      const response = {
        title: ticket.title,
        conceptTags: ticket.conceptTags.slice(),
        fixNote: ticket.fixNote,
        replies,
      };
      if (result.nextCursor !== undefined && result.nextCursor !== null) {
        if (!validTokenShape(result.nextCursor)) throw new Error('Invalid Bug FAQ reply boundary.');
        response.nextCursor = result.nextCursor;
      }
      return res.status(200).json(response);
    } catch (error) {
      if (error && error.code === 'INVALID_CURSOR') return res.status(400).json({ message: 'Invalid Bug FAQ request.' });
      return res.status(503).json({ message: 'Ticket service is temporarily unavailable. Please try again.' });
    }
  });

  router.use('/faq', (_req, res) => res.status(404).json({ message: 'FAQ result not found.' }));
  return router;
}

module.exports = {
  MAX_QUERY_CODE_POINTS,
  MAX_FAQ_TOKEN_LENGTH,
  createFaqRouter,
};
