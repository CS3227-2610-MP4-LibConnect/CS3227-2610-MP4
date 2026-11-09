// TA ticket queue router (spec ta-ticket-queue v0.1, R1 and R2; error codes in "Requirements").
// Identity comes only from the server session via `requireActiveActor`; every response is an
// explicit allow-list, so stored fields that are not named here are never returned.
const express = require('express');
const { createAccountGuards } = require('../account/guards');
const { STATUSES, LANGUAGES } = require('./constants');
const { createClaimRoutes } = require('./ta-claims');
const { createTaRepliesRoutes } = require('./ta-replies');

const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_CONCEPT_LENGTH = 30;
const MESSAGES = Object.freeze({
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'Ticket not found.',
  INVALID: 'Enter valid details.',
  RETRY: 'The ticket queue is temporarily unavailable. Please try again.',
});

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

function toListItem(ticket, viewerId) {
  const claimed = ticket.status === 'CLAIMED' && typeof ticket.claimedByTaId === 'string';
  return {
    ticketId: ticket.ticketId,
    title: ticket.title,
    language: ticket.language,
    conceptTags: Array.isArray(ticket.conceptTags) ? [...ticket.conceptTags] : [],
    status: ticket.status,
    claimedByMe: claimed && ticket.claimedByTaId === viewerId,
    claimed,
    createdAt: toIsoString(ticket.createdAt),
  };
}

function toFileView(file) {
  return { name: file && file.name, content: file && file.content };
}

/** Builds a name/role lookup that reads each `users` record at most once per request. */
function createUserLookup(accountStore) {
  const cache = new Map();
  return async (userId) => {
    if (typeof userId !== 'string') return null;
    if (!cache.has(userId)) cache.set(userId, await accountStore.getAccount(userId));
    return cache.get(userId);
  };
}

async function toDetailView(ticket, viewerId, lookup) {
  const student = await lookup(ticket.studentId);
  const claimer = ticket.claimedByTaId ? await lookup(ticket.claimedByTaId) : null;
  const replies = [];
  for (const reply of Array.isArray(ticket.replies) ? ticket.replies : []) {
    const author = await lookup(reply.authorUserId);
    replies.push({
      replyId: reply.replyId,
      message: reply.message,
      createdAt: toIsoString(reply.createdAt),
      authorName: author && typeof author.name === 'string' ? author.name : 'Unknown user',
      authorRole: author && author.accountType === 'TA' ? 'TA' : 'STUDENT',
      isMine: reply.authorUserId === viewerId,
    });
  }
  return {
    ticketId: ticket.ticketId,
    title: ticket.title,
    language: ticket.language,
    conceptTags: Array.isArray(ticket.conceptTags) ? [...ticket.conceptTags] : [],
    files: Array.isArray(ticket.files) ? ticket.files.map(toFileView) : [],
    repoUrl: ticket.repoUrl === undefined ? null : ticket.repoUrl,
    repoFilePaths: Array.isArray(ticket.repoFilePaths) ? [...ticket.repoFilePaths] : [],
    errorOutput: ticket.errorOutput === undefined ? null : ticket.errorOutput,
    expectedBehaviour: ticket.expectedBehaviour,
    actualBehaviour: ticket.actualBehaviour,
    attempted: ticket.attempted,
    status: ticket.status,
    fixNote: ticket.fixNote === undefined ? null : ticket.fixNote,
    createdAt: toIsoString(ticket.createdAt),
    updatedAt: toIsoString(ticket.updatedAt),
    resolvedAt: toIsoString(ticket.resolvedAt),
    studentName: student && typeof student.name === 'string' ? student.name : null,
    claimedByMe: ticket.status === 'CLAIMED' && ticket.claimedByTaId === viewerId,
    claimedByName: claimer && typeof claimer.name === 'string' ? claimer.name : null,
    replies,
  };
}

/** Returns the single string value of a query key, `undefined` if absent, or `null` if invalid. */
function singleQueryValue(query, key) {
  if (!Object.prototype.hasOwnProperty.call(query, key)) return undefined;
  const value = query[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseListQuery(query) {
  const status = singleQueryValue(query, 'status');
  const language = singleQueryValue(query, 'language');
  const concept = singleQueryValue(query, 'concept');
  const cursor = singleQueryValue(query, 'cursor');
  if (status === null || language === null || concept === null || cursor === null) return null;
  if (status !== undefined && status !== 'ACTIVE' && !STATUSES.includes(status)) return null;
  if (language !== undefined && !LANGUAGES.includes(language)) return null;
  if (concept !== undefined && concept.length > MAX_CONCEPT_LENGTH) return null;
  return {
    status: status || 'ACTIVE',
    language,
    concept: concept === undefined ? undefined : concept.trim().toLowerCase(),
    cursor,
  };
}

/**
 * @param {{ authStore: object, accountStore: { getAccount(userId: string): Promise<any> },
 *   ticketStore: object, notify: Function, now?: () => number }} deps
 */
function createTaTicketsRouter({ authStore, accountStore, ticketStore, notify, now = Date.now }) {
  const methods = ['listTickets', 'getTicket', 'claimTicket', 'unclaimTicket', 'resolveTicket', 'addReply'];
  if (!ticketStore || methods.some((name) => typeof ticketStore[name] !== 'function')) {
    throw new TypeError('A ticket store is required.');
  }
  if (typeof notify !== 'function') throw new TypeError('A notify function is required.');
  const guards = createAccountGuards({ authStore, accountStore, now });
  const { requireActiveActor, requireCsrf } = guards;

  function requireTa(req, res, next) {
    if (!req.actor || req.actor.accountType !== 'TA') {
      return res.status(403).json({ message: MESSAGES.FORBIDDEN });
    }
    return next();
  }

  /** Wraps an async handler with the generic `503` fallback; no error detail is returned. */
  const safe = (handler) => async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (res.headersSent) return undefined;
      return res.status(503).json({ message: MESSAGES.RETRY });
    }
  };

  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireActiveActor, requireTa);

  router.get('/', safe(async (req, res) => {
    const filters = parseListQuery(req.query || {});
    if (!filters) return res.status(400).json({ message: MESSAGES.INVALID });
    let page;
    try {
      page = await ticketStore.listTickets(filters);
    } catch (error) {
      if (error && error.code === 'INVALID_CURSOR') return res.status(400).json({ message: MESSAGES.INVALID });
      throw error;
    }
    return res.status(200).json({
      tickets: page.tickets.map((ticket) => toListItem(ticket, req.actor.userId)),
      nextCursor: page.nextCursor || null,
    });
  }));

  // T03 and T04: add one mount line each here (`router.use('/', createXRoutes(shared))`).
  // The shared dependencies below are the guards, store, and notify those sub-routers receive.
  // Mount them before the '/:ticketId' route so their '/:ticketId/<action>' paths are matched first.
  const shared = Object.freeze({ requireCsrf, ticketStore, accountStore, notify, safe, messages: MESSAGES });
  router.use('/', createClaimRoutes(shared));
  router.use('/', createTaRepliesRoutes(shared));

  router.get('/:ticketId', safe(async (req, res) => {
    const { ticketId } = req.params;
    if (!TICKET_ID_PATTERN.test(ticketId)) return res.status(404).json({ message: MESSAGES.NOT_FOUND });
    const ticket = await ticketStore.getTicket(ticketId);
    if (!ticket) return res.status(404).json({ message: MESSAGES.NOT_FOUND });
    return res.status(200).json(await toDetailView(ticket, req.actor.userId, createUserLookup(accountStore)));
  }));

  return router;
}

module.exports = { createTaTicketsRouter };
