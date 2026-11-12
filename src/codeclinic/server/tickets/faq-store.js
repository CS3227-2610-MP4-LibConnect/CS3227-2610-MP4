const { Firestore, Timestamp, GeoPoint, Bytes, DocumentReference } = require('@google-cloud/firestore');
const { isValidConceptTags, TICKET_ID_PATTERN, MAX_FIX_NOTE_LENGTH } = require('./constants');
const { sealFaqToken, openFaqToken } = require('./faq-token');

const SEARCH_SCAN_LIMIT = 100;
const SEARCH_MATCH_LIMIT = 20;
const REPLY_PAGE_LIMIT = 50;
const REPLY_READ_LIMIT = REPLY_PAGE_LIMIT + 1;
const MAX_FAQ_REPLY_LENGTH = 5000;
const CURSOR_VALUE_TAG = '__faqCursorValueType';

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function timestampParts(value) {
  if (value instanceof Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const millis = value.getTime();
    const seconds = Math.floor(millis / 1000);
    return { seconds, nanoseconds: (millis - seconds * 1000) * 1_000_000 };
  }
  return null;
}

function timestampFromParts(parts) {
  if (!isRecord(parts) || !Number.isSafeInteger(parts.seconds) || parts.seconds < 0 ||
      !Number.isInteger(parts.nanoseconds) || parts.nanoseconds < 0 || parts.nanoseconds >= 1e9) return null;
  return new Timestamp(parts.seconds, parts.nanoseconds);
}

function faqTokenContext(idHash, studentId, purpose, binding = {}) {
  return { idHash, studentId, purpose, binding };
}

function validBoundary(boundary, idName, requireCreatedAt = false) {
  if (!isRecord(boundary) || boundary.v !== 1 || !TICKET_ID_PATTERN.test(boundary.ticketId)) return false;
  if (idName && (typeof boundary[idName] !== 'string' || !TICKET_ID_PATTERN.test(boundary[idName]))) return false;
  if ((requireCreatedAt || Object.prototype.hasOwnProperty.call(boundary, 'createdAt')) &&
      !isValidBoundaryValue(boundary.createdAt)) return false;
  return true;
}

function isValidBoundaryValue(value, depth = 0) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth >= 8 || !value || typeof value !== 'object') return false;
  if (timestampFromParts(value)) return true;
  if (value[CURSOR_VALUE_TAG] === 'number') return ['NaN', 'Infinity', '-Infinity'].includes(value.value);
  if (value[CURSOR_VALUE_TAG] === 'geoPoint') {
    return Number.isFinite(value.latitude) && Number.isFinite(value.longitude) &&
      value.latitude >= -90 && value.latitude <= 90 && value.longitude >= -180 && value.longitude <= 180;
  }
  if (value[CURSOR_VALUE_TAG] === 'bytes') return typeof value.data === 'string' && value.data.length <= 2048;
  if (value[CURSOR_VALUE_TAG] === 'reference') {
    return typeof value.projectId === 'string' && value.projectId.length > 0 && value.projectId.length <= 128 &&
      typeof value.databaseId === 'string' && value.databaseId.length > 0 && value.databaseId.length <= 128 &&
      typeof value.path === 'string' && value.path.length <= 1500 && value.path.length > 0 &&
      value.path.split('/').length % 2 === 0;
  }
  if (value[CURSOR_VALUE_TAG] === 'array') {
    return Array.isArray(value.value) && value.value.length <= 100 &&
      value.value.every((item) => isValidBoundaryValue(item, depth + 1));
  }
  if (value[CURSOR_VALUE_TAG] === 'map') {
    return Array.isArray(value.value) && value.value.length <= 100 && value.value.every((entry) =>
      Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' &&
      isValidBoundaryValue(entry[1], depth + 1));
  }
  return false;
}

function orderedBoundaryValue(value) {
  const timestamp = timestampParts(value);
  if (timestamp) return timestamp;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : { [CURSOR_VALUE_TAG]: 'number', value: String(value) };
  }
  if (value instanceof GeoPoint) {
    return { [CURSOR_VALUE_TAG]: 'geoPoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof Bytes) {
    return { [CURSOR_VALUE_TAG]: 'bytes', data: Buffer.from(value.toUint8Array()).toString('base64') };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { [CURSOR_VALUE_TAG]: 'bytes', data: Buffer.from(value).toString('base64') };
  }
  if (value instanceof DocumentReference) {
    return {
      [CURSOR_VALUE_TAG]: 'reference',
      projectId: value.firestore.projectId,
      databaseId: value.firestore.databaseId,
      path: value.path,
    };
  }
  if (Array.isArray(value)) {
    if (value.length > 100) return undefined;
    const packed = value.map(orderedBoundaryValue);
    return packed.every((item) => isValidBoundaryValue(item))
      ? { [CURSOR_VALUE_TAG]: 'array', value: packed }
      : undefined;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > 100) return undefined;
    const packed = entries.map(([key, item]) => [key, orderedBoundaryValue(item)]);
    return packed.every((entry) => isValidBoundaryValue(entry[1]))
      ? { [CURSOR_VALUE_TAG]: 'map', value: packed }
      : undefined;
  }
  return undefined;
}

function queryBoundaryValue(value, db) {
  const timestamp = timestampFromParts(value);
  if (timestamp) return timestamp;
  if (!isRecord(value) || typeof value[CURSOR_VALUE_TAG] !== 'string') return value;
  switch (value[CURSOR_VALUE_TAG]) {
    case 'number':
      return value.value === 'NaN' ? Number.NaN : value.value === 'Infinity' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    case 'geoPoint':
      return new GeoPoint(value.latitude, value.longitude);
    case 'bytes':
      return Bytes.fromUint8Array(Buffer.from(value.data, 'base64'));
    case 'reference':
      if (db.projectId === value.projectId && db.databaseId === value.databaseId && typeof db.doc === 'function') {
        return db.doc(value.path);
      }
      return new Firestore({ projectId: value.projectId, databaseId: value.databaseId }).doc(value.path);
    case 'array':
      return value.value.map((item) => queryBoundaryValue(item, db));
    case 'map':
      return Object.fromEntries(value.value.map(([key, item]) => [key, queryBoundaryValue(item, db)]));
    default:
      return value;
  }
}

function cursorEncodingError() {
  const error = new Error('Bug FAQ continuation boundary cannot be encoded.');
  error.code = 'CURSOR_UNENCODABLE';
  return error;
}

async function sealContinuation(payload, context) {
  const token = await sealFaqToken(payload, context);
  if (!token) throw cursorEncodingError();
  return token;
}

function createFaqStore(db) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('A Firestore database is required.');

  return {
    async searchFaq({ idHash, studentId, query, field, cursor } = {}) {
      if (typeof idHash !== 'string' || typeof studentId !== 'string' ||
          typeof query !== 'string' || !['title', 'tags'].includes(field)) {
        throw new TypeError('A valid Bug FAQ search context is required.');
      }
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) throw new TypeError('A non-empty Bug FAQ query is required.');
      let after = null;
      if (cursor !== undefined) {
        after = await openFaqToken(cursor, faqTokenContext(idHash, studentId, 'searchCursor', {
          query: normalizedQuery,
          field,
        }));
        if (!validBoundary(after, null, true)) {
          const error = new Error('Invalid Bug FAQ cursor.');
          error.code = 'INVALID_CURSOR';
          throw error;
        }
      }

      let queryRef = db.collection('tickets')
        .where('status', '==', 'RESOLVED')
        .orderBy('createdAt', 'desc')
        .orderBy('__name__', 'asc');
      if (after) queryRef = queryRef.startAfter(queryBoundaryValue(after.createdAt, db), after.ticketId);
      const snapshot = await queryRef.limit(SEARCH_SCAN_LIMIT).get();
      const docs = Array.isArray(snapshot.docs) ? snapshot.docs : [];
      const tickets = [];
      let lastExamined = null;
      for (const doc of docs) {
        const data = safeData(doc);
        const rawCreatedAt = data && Object.prototype.hasOwnProperty.call(data, 'createdAt')
          ? data.createdAt : safeField(doc, 'createdAt');
        const createdAt = orderedBoundaryValue(rawCreatedAt);
        if (!isValidBoundaryValue(createdAt) || !TICKET_ID_PATTERN.test(doc.id)) throw cursorEncodingError();
        lastExamined = { v: 1, createdAt, ticketId: doc.id };
        if (!data || data.status !== 'RESOLVED' || !validFaqSummary(data)) continue;
        const source = field === 'title' ? data.title : data.conceptTags;
        const matches = field === 'title'
          ? source.toLowerCase().includes(normalizedQuery)
          : source.some((tag) => tag.toLowerCase().includes(normalizedQuery));
        if (!matches) continue;
        const faqRef = await sealFaqToken({ v: 1, ticketId: doc.id }, faqTokenContext(idHash, studentId, 'faqRef'));
        if (!faqRef) throw new Error('Could not create Bug FAQ reference.');
        tickets.push({ title: data.title, conceptTags: data.conceptTags.slice(), faqRef });
        if (tickets.length === SEARCH_MATCH_LIMIT) break;
      }

      const lastExaminedIndex = lastExamined ? docs.findIndex((doc) => doc.id === lastExamined.ticketId) : -1;
      const canContinue = !!lastExamined && (docs.length === SEARCH_SCAN_LIMIT ||
        lastExaminedIndex < docs.length - 1 || tickets.length === SEARCH_MATCH_LIMIT);
      const nextCursor = canContinue
        ? await sealContinuation(lastExamined, faqTokenContext(idHash, studentId, 'searchCursor', {
          query: normalizedQuery,
          field,
        }))
        : null;
      return { tickets, nextCursor };
    },

    async getFaqDetail(studentId, faqRef, { idHash, cursor } = {}) {
      if (typeof studentId !== 'string' || typeof idHash !== 'string' || typeof faqRef !== 'string') return null;
      const refPayload = await openFaqToken(faqRef, faqTokenContext(idHash, studentId, 'faqRef'));
      if (!validBoundary(refPayload) || Object.keys(refPayload).sort().join(',') !== 'ticketId,v') return null;
      let after = null;
      if (cursor !== undefined) {
        after = await openFaqToken(cursor, faqTokenContext(idHash, studentId, 'replyCursor', { faqRef }));
        if (!validBoundary(after, 'replyId', true) || after.ticketId !== refPayload.ticketId) {
          const error = new Error('Invalid Bug FAQ reply cursor.');
          error.code = 'INVALID_CURSOR';
          throw error;
        }
      }

      const ticketRef = db.collection('tickets').doc(refPayload.ticketId);
      const ticketSnapshot = await ticketRef.get();
      if (!ticketSnapshot.exists) return null;
      const stored = safeData(ticketSnapshot);
      if (!stored || stored.status !== 'RESOLVED' || !validFaqDetail(stored)) return null;

      let repliesQuery = ticketRef.collection('replies')
        .orderBy('createdAt', 'asc')
        .orderBy('replyId', 'asc');
      if (after) repliesQuery = repliesQuery.startAfter(queryBoundaryValue(after.createdAt, db), after.replyId);
      const repliesSnapshot = await repliesQuery.limit(REPLY_READ_LIMIT).get();
      const replyDocs = Array.isArray(repliesSnapshot.docs) ? repliesSnapshot.docs : [];
      const replies = [];
      let lastExamined = null;
      let examinedCount = 0;
      for (const doc of replyDocs) {
        const reply = safeData(doc);
        const rawCreatedAt = reply && Object.prototype.hasOwnProperty.call(reply, 'createdAt')
          ? reply.createdAt : safeField(doc, 'createdAt');
        const createdAt = orderedBoundaryValue(rawCreatedAt);
        if (!isValidBoundaryValue(createdAt) || !TICKET_ID_PATTERN.test(doc.id)) throw cursorEncodingError();
        examinedCount += 1;
        lastExamined = { v: 1, ticketId: refPayload.ticketId, createdAt, replyId: doc.id };
        if (!reply) continue;
        if (reply.ticketId !== ticketRef.id || reply.replyId !== doc.id || !validFaqReply(reply, stored)) continue;
        replies.push({
          replyId: doc.id,
          ticketId: reply.ticketId,
          authorUserId: reply.authorUserId,
          message: reply.message,
          createdAt: reply.createdAt,
        });
        if (replies.length === REPLY_PAGE_LIMIT) break;
      }
      const hasMore = !!lastExamined && (examinedCount < replyDocs.length || replyDocs.length === REPLY_READ_LIMIT);
      const nextCursor = hasMore
        ? await sealContinuation(lastExamined, faqTokenContext(idHash, studentId, 'replyCursor', { faqRef }))
        : null;
      const ticket = {
        ticketId: ticketSnapshot.id,
        studentId: stored.studentId,
        claimedByTaId: stored.claimedByTaId,
        status: stored.status,
        title: stored.title,
        conceptTags: stored.conceptTags.slice(),
        fixNote: stored.fixNote,
      };
      return { ticket, replies, hasMore: !!nextCursor, nextCursor };
    },
  };
}

function safeData(snapshot) {
  try {
    const value = snapshot && typeof snapshot.data === 'function' ? snapshot.data() : null;
    return isRecord(value) ? value : null;
  } catch (error) {
    return null;
  }
}

function safeField(snapshot, field) {
  try {
    return snapshot && typeof snapshot.get === 'function' ? snapshot.get(field) : null;
  } catch (error) {
    return null;
  }
}

function validFaqSummary(ticket) {
  return typeof ticket.title === 'string' && ticket.title.trim().length > 0 && ticket.title.length <= 255 &&
    isValidConceptTags(ticket.conceptTags);
}

function validFaqDetail(ticket) {
  return typeof ticket.studentId === 'string' && TICKET_ID_PATTERN.test(ticket.studentId) &&
    typeof ticket.title === 'string' && ticket.title.trim().length > 0 && ticket.title.length <= 255 &&
    isValidConceptTags(ticket.conceptTags) && typeof ticket.fixNote === 'string' &&
    ticket.fixNote.trim().length > 0 && ticket.fixNote.length <= MAX_FIX_NOTE_LENGTH &&
    (ticket.claimedByTaId === null || (typeof ticket.claimedByTaId === 'string' && TICKET_ID_PATTERN.test(ticket.claimedByTaId)));
}

function validFaqReply(reply, ticket) {
  return typeof reply.replyId === 'string' && TICKET_ID_PATTERN.test(reply.replyId) &&
    typeof reply.authorUserId === 'string' && TICKET_ID_PATTERN.test(reply.authorUserId) &&
    typeof reply.message === 'string' && reply.message.length <= MAX_FAQ_REPLY_LENGTH &&
    (reply.authorUserId === ticket.studentId || reply.authorUserId === ticket.claimedByTaId);
}

module.exports = {
  SEARCH_SCAN_LIMIT,
  SEARCH_MATCH_LIMIT,
  REPLY_PAGE_LIMIT,
  createFaqStore,
};
