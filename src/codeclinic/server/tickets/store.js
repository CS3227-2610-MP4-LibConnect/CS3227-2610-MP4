// Firebase Admin uses @google-cloud/firestore for its Timestamp values.
const { Timestamp } = require('@google-cloud/firestore');
const REPLY_PAGE_SIZE = 50;

function createStudentFirestoreTicketStore(db, { timestampNow = () => Timestamp.now() } = {}) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('A Firestore database is required.');
  async function ownedActiveTransaction(studentId, ticketId, write) {
    const ticketRef = db.collection('tickets').doc(ticketId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ticketRef);
      if (!snapshot.exists) return { kind: 'NOT_FOUND' };
      const current = snapshot.data();
      if (!current || current.studentId !== studentId) return { kind: 'NOT_FOUND' };
      if (current.status !== 'OPEN' && current.status !== 'CLAIMED') return { kind: 'CONFLICT' };
      return write(transaction, ticketRef, current);
    });
  }
  return {
    async getOwned(studentId, ticketId, { cursor } = {}) {
      const ticketRef = db.collection('tickets').doc(ticketId);
      const ticketSnapshot = await ticketRef.get();
      if (!ticketSnapshot.exists) return null;
      const stored = ticketSnapshot.data();
      if (!stored || stored.studentId !== studentId) return null;
      const ticket = {
        ticketId: ticketSnapshot.id,
        title: stored.title,
        language: stored.language,
        conceptTags: stored.conceptTags,
        files: stored.files,
        repoUrl: stored.repoUrl,
        repoFilePaths: stored.repoFilePaths,
        errorOutput: stored.errorOutput,
        expectedBehaviour: stored.expectedBehaviour,
        actualBehaviour: stored.actualBehaviour,
        attempted: stored.attempted,
        status: stored.status,
        claimedByTaId: stored.claimedByTaId,
        fixNote: stored.fixNote,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        resolvedAt: stored.resolvedAt,
      };
      let repliesQuery = ticketRef.collection('replies')
        .orderBy('createdAt', 'asc')
        .orderBy('replyId', 'asc');
      if (cursor) repliesQuery = repliesQuery.startAfter(cursor.createdAt, cursor.replyId);
      const repliesSnapshot = await repliesQuery.limit(REPLY_PAGE_SIZE).get();
      const replies = repliesSnapshot.docs.map((doc) => {
        const reply = doc.data();
        return {
          replyId: reply.replyId || doc.id,
          authorUserId: reply.authorUserId,
          message: reply.message,
          createdAt: reply.createdAt,
        };
      });
      let hasMore = false;
      if (replies.length === REPLY_PAGE_SIZE) {
        const lastReply = replies[replies.length - 1];
        const nextSnapshot = await ticketRef.collection('replies')
          .orderBy('createdAt', 'asc')
          .orderBy('replyId', 'asc')
          .startAfter(lastReply.createdAt, lastReply.replyId)
          .limit(1)
          .get();
        hasMore = nextSnapshot.docs.length > 0;
      }
      const lastReply = replies[replies.length - 1];
      return { ticket, replies, hasMore, pageCursor: hasMore && lastReply
        ? { createdAt: lastReply.createdAt, replyId: lastReply.replyId }
        : null };
    },
    async listActive(studentId) {
      const snapshot = await db.collection('tickets')
        .where('studentId', '==', studentId)
        .where('status', 'in', ['OPEN', 'CLAIMED'])
        .orderBy('updatedAt', 'desc')
        .orderBy('ticketId', 'asc')
        .limit(5)
        .get();
      return snapshot.docs.map((doc) => {
        const ticket = doc.data();
        return {
          ticketId: ticket.ticketId,
          title: ticket.title,
          language: ticket.language,
          conceptTags: ticket.conceptTags,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
        };
      });
    },
    async listPage(studentId, view, cursor) {
      const statuses = view === 'open' ? ['OPEN', 'CLAIMED'] : ['CLOSED', 'RESOLVED'];
      let query = db.collection('tickets')
        .where('studentId', '==', studentId)
        .where('status', 'in', statuses)
        .orderBy('updatedAt', 'desc')
        .orderBy('ticketId', 'asc');
      if (cursor) query = query.startAfter(cursor.updatedAt, cursor.ticketId);
      const snapshot = await query.limit(21).get();
      const docs = snapshot.docs || [];
      const hasMore = docs.length > 20;
      const pageDocs = docs.slice(0, 20);
      const tickets = pageDocs.map((doc) => {
        const ticket = doc.data();
        return {
          ticketId: ticket.ticketId || doc.id,
          title: ticket.title,
          language: ticket.language,
          conceptTags: ticket.conceptTags,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
        };
      });
      const last = hasMore ? pageDocs[pageDocs.length - 1] : null;
      const lastTicket = last ? last.data() : null;
      return {
        tickets,
        nextCursor: lastTicket ? { updatedAt: lastTicket.updatedAt, ticketId: lastTicket.ticketId || last.id } : null,
      };
    },
    async create(studentId, input) {
      const ticketRef = db.collection('tickets').doc();
      const timestamp = timestampNow();
      const ticket = {
        ticketId: ticketRef.id,
        studentId,
        title: input.title,
        language: input.language,
        conceptTags: input.conceptTags,
        files: input.files,
        repoUrl: input.repoUrl,
        repoFilePaths: input.repoFilePaths,
        errorOutput: input.errorOutput,
        expectedBehaviour: input.expectedBehaviour,
        actualBehaviour: input.actualBehaviour,
        attempted: input.attempted,
        status: 'OPEN',
        claimedByTaId: null,
        fixNote: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        resolvedAt: null,
      };
      await ticketRef.create(ticket);
      return ticketRef.id;
    },
    async reply(studentId, ticketId, message) {
      const replyId = db.collection('tickets').doc(ticketId).collection('replies').doc().id;
      return ownedActiveTransaction(studentId, ticketId, (transaction, ticketRef) => {
        const createdAt = timestampNow();
        const updatedAt = createdAt;
        const replyRef = ticketRef.collection('replies').doc(replyId);
        transaction.create(replyRef, {
          replyId,
          ticketId,
          authorUserId: studentId,
          message,
          createdAt,
        });
        transaction.update(ticketRef, { updatedAt });
        return { kind: 'OK', replyId, createdAt, updatedAt };
      });
    },
    async close(studentId, ticketId) {
      return ownedActiveTransaction(studentId, ticketId, (transaction, ticketRef) => {
        const updatedAt = timestampNow();
        transaction.update(ticketRef, {
          status: 'CLOSED',
          claimedByTaId: null,
          fixNote: null,
          resolvedAt: null,
          updatedAt,
        });
        return { kind: 'OK', updatedAt };
      });
    },
  };
}

// Ticket stores (spec ta-ticket-queue v0.1, sections C1, C2, R1-R6).
// The in-memory store backs unit tests; the Firestore store has the same interface.
// Only server code uses either store. Every transition re-reads status and
// claimedByTaId, and `updatedAt` / `createdAt` / `resolvedAt` are set here.
const crypto = require('crypto');
const { evaluateTransition } = require('./transitions');
const { STATUSES, PAGE_SIZE, MAX_REPLIES } = require('./constants');

const MAX_CURSOR_LENGTH = 512;
const MAX_CURSOR_ID_LENGTH = 128;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// Firestore Timestamp range: 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z, in milliseconds.
const MIN_TIMESTAMP_MS = -62135596800000;
const MAX_TIMESTAMP_MS = 253402300799999;

const CONFLICT = Object.freeze({ ok: false, reason: 'CONFLICT' });
const NOT_FOUND = Object.freeze({ ok: false, reason: 'NOT_FOUND' });

function toMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return NaN;
}

function encodeCursor({ createdAt, ticketId }) {
  const json = JSON.stringify({ createdAtMs: toMillis(createdAt), ticketId });
  return Buffer.from(json, 'utf8').toString('base64url');
}

/** @returns {{ createdAtMs: number, ticketId: string } | null} */
function decodeCursor(cursor) {
  if (typeof cursor !== 'string' || cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) return null;
  if (!BASE64URL.test(cursor)) return null;
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const { createdAtMs, ticketId } = parsed;
  if (typeof createdAtMs !== 'number' || !Number.isFinite(createdAtMs)) return null;
  if (createdAtMs < MIN_TIMESTAMP_MS || createdAtMs > MAX_TIMESTAMP_MS) return null;
  if (typeof ticketId !== 'string' || !TICKET_ID_PATTERN.test(ticketId)) return null;
  return { createdAtMs, ticketId };
}

function clone(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  }
  return value;
}

function invalidCursorError() {
  const error = new Error('Invalid cursor.');
  error.code = 'INVALID_CURSOR';
  return error;
}

function statusesFor(status) {
  if (status === undefined || status === null || status === 'ACTIVE') return ['OPEN', 'CLAIMED'];
  return STATUSES.includes(status) ? [status] : [];
}

function actorFor(actorId) {
  return { userId: actorId, accountType: 'TA' };
}

function createInMemoryTicketStore({ now = () => Date.now(), newId = () => crypto.randomUUID() } = {}) {
  const tickets = new Map();
  const replies = new Map();

  function decide(ticket, event, actorId) {
    return evaluateTransition({
      event,
      status: ticket.status,
      claimedByTaId: ticket.claimedByTaId,
      actor: actorFor(actorId),
      studentId: ticket.studentId,
    });
  }

  return {
    seedTicket(ticket) {
      tickets.set(ticket.ticketId, clone(ticket));
      if (!replies.has(ticket.ticketId)) replies.set(ticket.ticketId, []);
    },

    seedReply(ticketId, reply) {
      if (!replies.has(ticketId)) replies.set(ticketId, []);
      replies.get(ticketId).push(clone(reply));
    },

    async listTickets({ status, language, concept, cursor } = {}) {
      let after = null;
      if (cursor !== undefined && cursor !== null) {
        after = decodeCursor(cursor);
        if (!after) throw invalidCursorError();
      }
      const wanted = statusesFor(status);
      const matches = [...tickets.values()]
        .filter((t) => wanted.includes(t.status))
        .filter((t) => !language || t.language === language)
        .filter((t) => !concept || (Array.isArray(t.conceptTags) && t.conceptTags.includes(concept)))
        .sort((a, b) => (toMillis(a.createdAt) - toMillis(b.createdAt))
          || (a.ticketId < b.ticketId ? -1 : a.ticketId > b.ticketId ? 1 : 0))
        .filter((t) => {
          if (!after) return true;
          const ms = toMillis(t.createdAt);
          return ms > after.createdAtMs || (ms === after.createdAtMs && t.ticketId > after.ticketId);
        });
      const page = matches.slice(0, PAGE_SIZE);
      const nextCursor = matches.length > PAGE_SIZE
        ? encodeCursor({ createdAt: page[page.length - 1].createdAt, ticketId: page[page.length - 1].ticketId })
        : null;
      return { tickets: page.map(clone), nextCursor };
    },

    async getTicket(ticketId) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return null;
      const thread = [...(replies.get(ticketId) || [])]
        .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
        .slice(0, MAX_REPLIES);
      return { ...clone(ticket), replies: thread.map(clone) };
    },

    async claimTicket(ticketId, actorId) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return { ...NOT_FOUND };
      const decision = decide(ticket, 'claim', actorId);
      if (!decision.allowed) return { ...CONFLICT };
      ticket.status = decision.to;
      ticket.claimedByTaId = actorId;
      ticket.updatedAt = new Date(now());
      return { ok: true, ticket: clone(ticket) };
    },

    async unclaimTicket(ticketId, actorId) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return { ...NOT_FOUND };
      const decision = decide(ticket, 'unclaim', actorId);
      if (!decision.allowed) return { ...CONFLICT };
      ticket.status = decision.to;
      ticket.claimedByTaId = null;
      ticket.updatedAt = new Date(now());
      return { ok: true, ticket: clone(ticket) };
    },

    async resolveTicket(ticketId, actorId, fixNote) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return { ...NOT_FOUND };
      const decision = decide(ticket, 'resolve', actorId);
      if (!decision.allowed) return { ...CONFLICT };
      const at = new Date(now());
      ticket.status = decision.to;
      ticket.fixNote = fixNote;
      ticket.resolvedAt = at;
      ticket.updatedAt = at;
      return { ok: true, ticket: clone(ticket) };
    },

    async addReply(ticketId, { authorUserId, message }) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return { ...NOT_FOUND };
      const decision = decide(ticket, 'reply', authorUserId);
      if (!decision.allowed) return { ...CONFLICT };
      const at = new Date(now());
      const reply = { replyId: newId(), ticketId, authorUserId, message, createdAt: at };
      if (!replies.has(ticketId)) replies.set(ticketId, []);
      replies.get(ticketId).push(reply);
      ticket.updatedAt = at;
      return { ok: true, reply: clone(reply), ticket: clone(ticket) };
    },
  };
}

/**
 * Firestore-backed store with the same interface and semantics.
 * Collections: tickets/{ticketId} and tickets/{ticketId}/replies/{replyId}.
 * The list query needs a composite index in production (out of scope, Q4);
 * the emulator does not.
 */
function createTaFirestoreTicketStore(db, deps = {}) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    throw new TypeError('A Firestore database is required.');
  }
  const { FieldValue, Timestamp } = deps.firestore || require('firebase-admin/firestore');
  const ticketsCol = () => db.collection('tickets');
  const ticketRef = (ticketId) => ticketsCol().doc(ticketId);
  const validId = (id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_CURSOR_ID_LENGTH && !id.includes('/');

  const clock = deps.now || (() => Date.now());

  /**
   * Runs one transactional transition. The result is built from the data read and written
   * inside the transaction; server timestamps are reported as the local clock time at commit
   * (`now`), which is within the transaction's duration of the stored value.
   */
  async function transition(ticketId, event, actorId, buildChanges) {
    if (!validId(ticketId)) return { ...NOT_FOUND };
    return db.runTransaction(async (transaction) => {
      const ref = ticketRef(ticketId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { ...NOT_FOUND };
      const data = snapshot.data();
      const decision = evaluateTransition({
        event,
        status: data.status,
        claimedByTaId: data.claimedByTaId,
        actor: actorFor(actorId),
        studentId: data.studentId,
      });
      if (!decision.allowed) return { ...CONFLICT };
      const at = new Date(clock());
      const changes = { ...buildChanges(decision), updatedAt: FieldValue.serverTimestamp() };
      if (event === 'reply') {
        const replyRef = ref.collection('replies').doc();
        transaction.create(replyRef, {
          replyId: replyRef.id,
          ticketId,
          authorUserId: actorId,
          message: changes.message,
          createdAt: FieldValue.serverTimestamp(),
        });
        transaction.update(ref, { updatedAt: changes.updatedAt });
        return {
          ok: true,
          reply: { replyId: replyRef.id, ticketId, authorUserId: actorId, message: changes.message, createdAt: at },
          ticket: { ...data, ticketId, updatedAt: at },
        };
      }
      transaction.update(ref, changes);
      const merged = { ...data, ...changes, ticketId, updatedAt: at, replies: [] };
      if (changes.resolvedAt !== undefined) merged.resolvedAt = at;
      return { ok: true, ticket: merged };
    });
  }

  /** Best-effort refresh for the reply thread; a failed read never fails a committed write. */
  async function withThread(self, result) {
    if (!result.ok) return result;
    try {
      const fresh = await self.getTicket(result.ticket.ticketId);
      if (fresh) return { ok: true, ticket: fresh };
    } catch (error) {
      // Fall back to the data built inside the transaction.
    }
    return result;
  }

  return {
    async listTickets({ status, language, concept, cursor } = {}) {
      let after = null;
      if (cursor !== undefined && cursor !== null) {
        after = decodeCursor(cursor);
        if (!after) throw invalidCursorError();
      }
      const wanted = statusesFor(status);
      if (wanted.length === 0) return { tickets: [], nextCursor: null };
      let query = ticketsCol();
      query = wanted.length === 1 ? query.where('status', '==', wanted[0]) : query.where('status', 'in', wanted);
      if (language) query = query.where('language', '==', language);
      if (concept) query = query.where('conceptTags', 'array-contains', concept);
      query = query.orderBy('createdAt', 'asc').orderBy('__name__', 'asc');
      if (after) query = query.startAfter(Timestamp.fromMillis(after.createdAtMs), after.ticketId);
      const snapshot = await query.limit(PAGE_SIZE + 1).get();
      const docs = snapshot.docs.map((doc) => ({ ...doc.data(), ticketId: doc.id }));
      const page = docs.slice(0, PAGE_SIZE);
      const nextCursor = docs.length > PAGE_SIZE
        ? encodeCursor({ createdAt: page[page.length - 1].createdAt, ticketId: page[page.length - 1].ticketId })
        : null;
      return { tickets: page, nextCursor };
    },

    async getTicket(ticketId) {
      if (!validId(ticketId)) return null;
      const snapshot = await ticketRef(ticketId).get();
      if (!snapshot.exists) return null;
      const thread = await ticketRef(ticketId).collection('replies')
        .orderBy('createdAt', 'asc').orderBy('__name__', 'asc').limit(MAX_REPLIES).get();
      return {
        ...snapshot.data(),
        ticketId: snapshot.id,
        replies: thread.docs.map((doc) => ({ ...doc.data(), replyId: doc.id })),
      };
    },

    async claimTicket(ticketId, actorId) {
      const result = await transition(ticketId, 'claim', actorId, (d) => ({ status: d.to, claimedByTaId: actorId }));
      return withThread(this, result);
    },

    async unclaimTicket(ticketId, actorId) {
      const result = await transition(ticketId, 'unclaim', actorId, (d) => ({ status: d.to, claimedByTaId: null }));
      return withThread(this, result);
    },

    async resolveTicket(ticketId, actorId, fixNote) {
      const result = await transition(ticketId, 'resolve', actorId, (d) => ({
        status: d.to, fixNote, resolvedAt: FieldValue.serverTimestamp(),
      }));
      return withThread(this, result);
    },

    async addReply(ticketId, { authorUserId, message }) {
      return transition(ticketId, 'reply', authorUserId, () => ({ message }));
    },
  };
}

function createFirestoreTicketStore(db, deps = {}) {
  const store = createStudentFirestoreTicketStore(db, deps);
  let taStore;
  for (const method of ['listTickets', 'getTicket', 'claimTicket', 'unclaimTicket', 'resolveTicket', 'addReply']) {
    store[method] = (...args) => {
      if (!taStore) taStore = createTaFirestoreTicketStore(db, deps);
      return taStore[method].apply(store, args);
    };
  }
  return store;
}

module.exports = { REPLY_PAGE_SIZE, createInMemoryTicketStore, createFirestoreTicketStore, encodeCursor, decodeCursor };
