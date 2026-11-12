const crypto = require('crypto');
const express = require('express');
const { createSessionAuthenticator, hashSubmittedCsrf } = require('../auth/login');
const { validateTicketInput, validateReplyInput, validateTicketId, decodeReplyCursor, encodeReplyCursor, validateTicketListQuery } = require('./validation');
const { decodeListCursor, encodeListCursor } = require('./list-cursor');
const { Timestamp } = require('@google-cloud/firestore');
const { createStudentHelpChatRouter } = require('./student-help-chat');

const MAX_BODY_BYTES = 128 * 1024;
const RETRY_MESSAGE = 'Ticket service is temporarily unavailable. Please try again.';
const AUTH_REQUIRED = 'Authentication required.';
const NOT_VERIFIED = 'Request could not be verified.';
const FORBIDDEN = 'You do not have permission to do that.';
const MAX_AUTHOR_LOOKUPS = 5;

async function resolveReplyAuthors(replies, repository, ownerId) {
  const resolved = [];
  for (let offset = 0; offset < replies.length; offset += MAX_AUTHOR_LOOKUPS) {
    const block = replies.slice(offset, offset + MAX_AUTHOR_LOOKUPS);
    resolved.push(...await Promise.all(block.map(async (reply) => {
      const isOwner = reply.authorUserId === ownerId;
      const authorAccount = await repository.getUserById(reply.authorUserId);
      const trustedAuthor = authorAccount && authorAccount.userId === reply.authorUserId;
      const authorType = isOwner ? 'STUDENT'
        : trustedAuthor && ['STUDENT', 'TA'].includes(authorAccount.accountType) ? authorAccount.accountType : 'TA';
      const displayName = trustedAuthor && typeof authorAccount.name === 'string'
        ? authorAccount.name.trim().slice(0, 200)
        : '';
      return {
        replyId: reply.replyId,
        author: { name: displayName || (isOwner && !trustedAuthor ? '[deleted account]' : authorType === 'STUDENT' ? 'Student' : 'TA'), role: authorType },
        message: reply.message,
        createdAt: reply.createdAt,
      };
    })));
  }
  return resolved;
}

function csrfMatches(req, storedHash) {
  const submittedHash = hashSubmittedCsrf(req);
  return /^[a-f0-9]{64}$/.test(submittedHash) && typeof storedHash === 'string' &&
    /^[a-f0-9]{64}$/.test(storedHash) &&
    crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function createTicketsRouter({ repository, authStore, store, now = Date.now } = {}) {
  if (!repository || typeof repository.getUserById !== 'function' ||
      !authStore || typeof authStore.getSession !== 'function' ||
      typeof authStore.touchSession !== 'function' || typeof authStore.deleteSession !== 'function' ||
      !store || typeof store.create !== 'function') {
    throw new TypeError('Ticket router dependencies are required.');
  }
  const authenticateRequest = createSessionAuthenticator(repository, authStore, now);
  const router = express.Router();
  router.use(createStudentHelpChatRouter({ authenticateRequest, repository, store, csrfMatches }));

  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const input = validateTicketListQuery(req.query);
      if (!input) return res.status(400).json({ message: 'Invalid ticket request.' });
      const cursor = input.cursor === undefined ? undefined : decodeListCursor(input.cursor, input.view, Timestamp);
      if (input.cursor !== undefined && !cursor) return res.status(400).json({ message: 'Invalid ticket request.' });
      const auth = await authenticateRequest(req, res);
      if (!auth) return res.status(401).json({ message: AUTH_REQUIRED });
      if (auth.accountType !== 'STUDENT') return res.status(403).json({ message: FORBIDDEN });
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' ||
          account.accountType !== 'STUDENT') return res.status(401).json({ message: AUTH_REQUIRED });
      if (account.mustChangePassword === true) {
        return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      }
      const result = await store.listPage(auth.session.userId, input.view, cursor);
      const response = { tickets: result.tickets };
      if (result.nextCursor) {
        const nextCursor = encodeListCursor(input.view, result.nextCursor);
        if (!nextCursor) throw new Error('Invalid ticket page boundary.');
        response.nextCursor = nextCursor;
      }
      return res.status(200).json(response);
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  router.get('/active', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return res.status(401).json({ message: AUTH_REQUIRED });
      if (auth.accountType !== 'STUDENT') return res.status(403).json({ message: FORBIDDEN });
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' ||
          account.accountType !== 'STUDENT') return res.status(401).json({ message: AUTH_REQUIRED });
      if (account.mustChangePassword === true) {
        return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      }
      const tickets = await store.listActive(auth.session.userId);
      return res.status(200).json({ tickets });
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  router.get('/:ticketId', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!validateTicketId(req.params.ticketId)) return res.status(400).json({ message: 'Invalid ticket request.' });
      const cursorProvided = Object.prototype.hasOwnProperty.call(req.query, 'cursor');
      const cursor = cursorProvided ? decodeReplyCursor(req.query.cursor, Timestamp) : undefined;
      if (cursorProvided && !cursor) return res.status(400).json({ message: 'Invalid ticket request.' });
      const auth = await authenticateRequest(req, res);
      if (!auth) return res.status(401).json({ message: AUTH_REQUIRED });
      if (auth.accountType !== 'STUDENT') return res.status(403).json({ message: FORBIDDEN });
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' ||
          account.accountType !== 'STUDENT') return res.status(401).json({ message: AUTH_REQUIRED });
      if (account.mustChangePassword === true) {
        return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      }
      const result = await store.getOwned(auth.session.userId, req.params.ticketId, { cursor });
      if (!result) return res.status(404).json({ message: 'Ticket not found.' });
      const replies = await resolveReplyAuthors(result.replies, repository, auth.session.userId);
      const response = { ticket: result.ticket, replies };
      if (result.hasMore === true) {
        const nextCursor = encodeReplyCursor(result.pageCursor);
        if (!nextCursor) throw new Error('Invalid reply page boundary.');
        response.nextCursor = nextCursor;
      }
      return res.status(200).json(response);
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  router.post('/', express.json({ limit: MAX_BODY_BYTES, strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return res.status(401).json({ message: AUTH_REQUIRED });
      if (auth.accountType !== 'STUDENT') return res.status(403).json({ message: FORBIDDEN });
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' ||
          account.accountType !== 'STUDENT') return res.status(401).json({ message: AUTH_REQUIRED });
      if (account.mustChangePassword === true) {
        return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      }
      if (!csrfMatches(req, auth.session.csrfTokenHash)) {
        return res.status(403).json({ message: NOT_VERIFIED });
      }
      const input = validateTicketInput(req.body);
      if (!input) return res.status(400).json({ message: 'Enter valid ticket details.' });
      const ticketId = await store.create(auth.session.userId, input);
      return res.status(201).json({ ticketId });
    } catch (error) {
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  async function authenticateStudentWrite(req, res) {
    const auth = await authenticateRequest(req, res);
    if (!auth) {
      res.status(401).json({ message: AUTH_REQUIRED });
      return null;
    }
    if (auth.accountType !== 'STUDENT') {
      res.status(403).json({ message: FORBIDDEN });
      return null;
    }
    const account = await repository.getUserById(auth.session.userId);
    if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' ||
        account.accountType !== 'STUDENT') {
      res.status(401).json({ message: AUTH_REQUIRED });
      return null;
    }
    if (account.mustChangePassword === true) {
      res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' });
      return null;
    }
    if (!csrfMatches(req, auth.session.csrfTokenHash)) {
      res.status(403).json({ message: NOT_VERIFIED });
      return null;
    }
    return { ...auth, account };
  }

  router.post('/:ticketId/replies', express.json({ limit: MAX_BODY_BYTES, strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!validateTicketId(req.params.ticketId)) return res.status(400).json({ message: 'Invalid ticket request.' });
      const auth = await authenticateStudentWrite(req, res);
      if (!auth) return;
      const input = validateReplyInput(req.body);
      if (!input) return res.status(400).json({ message: 'Enter a valid reply.' });
      const result = await store.reply(auth.session.userId, req.params.ticketId, input.message);
      if (result && result.kind === 'NOT_FOUND') return res.status(404).json({ message: 'Ticket not found.' });
      if (result && result.kind === 'CONFLICT') return res.status(409).json({ message: 'This ticket is no longer active.' });
      return res.status(201).json({ reply: {
        replyId: result.replyId,
        author: { name: typeof auth.account.name === 'string' ? auth.account.name.trim().slice(0, 200) || 'Student' : 'Student', role: 'STUDENT' },
        message: input.message,
        createdAt: result.createdAt,
      } });
    } catch (error) {
      if (error && error.code === 'NOT_FOUND') return res.status(404).json({ message: 'Ticket not found.' });
      if (error && error.code === 'CONFLICT') return res.status(409).json({ message: 'This ticket is no longer active.' });
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  router.post('/:ticketId/close', express.json({ limit: MAX_BODY_BYTES, strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!validateTicketId(req.params.ticketId)) return res.status(400).json({ message: 'Invalid ticket request.' });
      const auth = await authenticateStudentWrite(req, res);
      if (!auth) return;
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length !== 0) {
        return res.status(400).json({ message: 'Invalid close request.' });
      }
      const result = await store.close(auth.session.userId, req.params.ticketId);
      if (result && result.kind === 'NOT_FOUND') return res.status(404).json({ message: 'Ticket not found.' });
      if (result && result.kind === 'CONFLICT') return res.status(409).json({ message: 'This ticket is no longer active.' });
      return res.status(200).json({ status: 'CLOSED', updatedAt: result.updatedAt });
    } catch (error) {
      if (error && error.code === 'NOT_FOUND') return res.status(404).json({ message: 'Ticket not found.' });
      if (error && error.code === 'CONFLICT') return res.status(409).json({ message: 'This ticket is no longer active.' });
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  });

  // Handle parser failures locally, before the existing login app's 8 KiB parser.
  router.use((error, req, res, next) => {
    if (error && error.type === 'entity.too.large') {
      res.set('Cache-Control', 'no-store');
      return res.status(413).json({ message: 'Request body is too large.' });
    }
    if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({ message: 'Enter valid ticket details.' });
    }
    return next(error);
  });
  return router;
}

module.exports = { MAX_BODY_BYTES, MAX_AUTHOR_LOOKUPS, createTicketsRouter };
