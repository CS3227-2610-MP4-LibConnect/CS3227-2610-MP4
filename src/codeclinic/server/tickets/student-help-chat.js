'use strict';

const express = require('express');
const { LANGUAGES } = require('./validation');
const { FEATURE, MAX_INPUT_CHARS, serializeInput } = require('../ai/student-ticket-help');
const { redact, redactAndCap } = require('../ai/redact');
const { validateTicketId } = require('./validation');

const MAX_BODY_BYTES = 128 * 1024;
// Leave room for a secret pattern completed across the next page boundary.
// The longest bounded redaction match is an email (under 800 code units); the
// open-ended private-key and assignment patterns already collapse their
// available prefix to one marker on every incremental check.
const REDACTION_BOUNDARY_MARGIN = 2048;
const DRAFT_FIELDS = ['title', 'language', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'errorOutput', 'conceptTags', 'files', 'repoUrl', 'repoFilePaths'];
const LIMITS = { title: 255, language: 32, expectedBehaviour: 5000, actualBehaviour: 5000, attempted: 5000, errorOutput: 5000, conceptTags: 154, repoUrl: 255, repoFilePaths: 5000 };

function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function keysAre(value, allowed, required = []) {
  return isRecord(value) && Object.keys(value).every((key) => allowed.includes(key)) && required.every((key) => Object.hasOwn(value, key));
}
function validHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history) || history.length > 8 || (history.length > 0 && history.length % 2 !== 0)) return null;
  for (let index = 0; index < history.length; index += 1) {
    const turn = history[index];
    if (!keysAre(turn, ['role', 'text'], ['role', 'text']) || turn.role !== (index % 2 === 0 ? 'STUDENT' : 'BOT') ||
        typeof turn.text !== 'string' || Array.from(turn.text).length < 1 || Array.from(turn.text).length > 2000) return null;
  }
  return history.map(({ role, text }) => ({ role, text }));
}
function validDraft(draft) {
  if (!keysAre(draft, DRAFT_FIELDS, DRAFT_FIELDS)) return null;
  for (const [field, max] of Object.entries(LIMITS)) {
    if (typeof draft[field] !== 'string' || Array.from(draft[field]).length > max) return null;
  }
  if (draft.language !== '' && !LANGUAGES.includes(draft.language)) return null;
  if (!Array.isArray(draft.files) || draft.files.length > 3) return null;
  const files = [];
  for (const file of draft.files) {
    if (!keysAre(file, ['filename', 'content'], ['filename', 'content']) || typeof file.filename !== 'string' ||
        typeof file.content !== 'string' || Array.from(file.filename).length > 120 ||
        Buffer.byteLength(file.content, 'utf8') > 24 * 1024) return null;
    files.push({ filename: file.filename, content: file.content });
  }
  const paths = draft.repoFilePaths.split(/\r?\n/).filter((path) => path.trim() !== '');
  if (paths.length > 10 || paths.reduce((sum, path) => sum + Array.from(path).length, 0) > 5000) return null;
  return { ...draft, files };
}
function validateCreateChat(body) {
  if (!keysAre(body, ['question', 'history', 'draft'], ['question', 'draft']) || typeof body.question !== 'string') return null;
  const question = body.question.trim();
  if (Array.from(question).length < 1 || Array.from(question).length > 2000) return null;
  const history = validHistory(body.history);
  const draft = validDraft(body.draft);
  if (!history || !draft) return null;
  return { question, history, draft };
}

function errorResponse(res, status, code) {
  res.set('Cache-Control', 'no-store');
  return res.status(status).json({ error: { code } });
}

function createStudentHelpChatRouter({ authenticateRequest, repository, store, csrfMatches } = {}) {
  const router = express.Router();
  router.post('/help-chat', express.json({ limit: MAX_BODY_BYTES, strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return errorResponse(res, 401, 'UNAUTHENTICATED');
      if (auth.accountType !== 'STUDENT') return errorResponse(res, 403, 'FORBIDDEN');
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' || account.accountType !== 'STUDENT') {
        return errorResponse(res, 403, 'FORBIDDEN');
      }
      if (account.mustChangePassword === true || !csrfMatches(req, auth.session.csrfTokenHash)) return errorResponse(res, 403, 'FORBIDDEN');
      const input = validateCreateChat(req.body);
      if (!input) return errorResponse(res, 400, 'INVALID_REQUEST');
      const gateway = req.app.locals.aiGateway;
      if (!gateway || typeof gateway.run !== 'function') return errorResponse(res, 503, 'AI_UNAVAILABLE');
      const result = await gateway.run({ feature: FEATURE, actor: { userId: auth.session.userId, accountType: 'STUDENT' }, input: { page: 'create', ...input } });
      if (!result || result.ok !== true || !result.data) {
        const code = result && ['AI_RATE_LIMITED', 'AI_INPUT_TOO_LARGE', 'AI_INVALID_OUTPUT'].includes(result.code) ? result.code : 'AI_UNAVAILABLE';
        return errorResponse(res, code === 'AI_RATE_LIMITED' ? 429 : code === 'AI_INPUT_TOO_LARGE' ? 413 : 503, code);
      }
      return res.status(200).json({ reply: result.data });
    } catch {
      return errorResponse(res, 503, 'AI_UNAVAILABLE');
    }
  });
  router.post('/:ticketId/help-chat', express.json({ limit: MAX_BODY_BYTES, strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return errorResponse(res, 401, 'UNAUTHENTICATED');
      if (auth.accountType !== 'STUDENT') return errorResponse(res, 403, 'FORBIDDEN');
      const account = await repository.getUserById(auth.session.userId);
      if (!account || account.userId !== auth.session.userId || account.accountStatus !== 'ACTIVE' || account.accountType !== 'STUDENT') {
        return errorResponse(res, 401, 'UNAUTHENTICATED');
      }
      if (account.mustChangePassword === true || !csrfMatches(req, auth.session.csrfTokenHash)) return errorResponse(res, 403, 'FORBIDDEN');
      if (!validateTicketId(req.params.ticketId)) return errorResponse(res, 400, 'INVALID_REQUEST');
      if (!keysAre(req.body, ['question', 'history'], ['question']) || typeof req.body.question !== 'string') return errorResponse(res, 400, 'INVALID_REQUEST');
      const question = req.body.question.trim();
      if (Array.from(question).length < 1 || Array.from(question).length > 2000) return errorResponse(res, 400, 'INVALID_REQUEST');
      const history = validHistory(req.body.history);
      if (!history) return errorResponse(res, 400, 'INVALID_REQUEST');

      let cursor;
      let ticket;
      let initialAssignedTaId;
      let firstPage = true;
      const replyCandidates = [];
      const ticketFields = ['title', 'language', 'conceptTags', 'files', 'repoUrl', 'repoFilePaths', 'errorOutput', 'expectedBehaviour', 'actualBehaviour', 'attempted'];
      do {
        const page = await store.getOwned(auth.session.userId, req.params.ticketId, { cursor });
        if (!page) return errorResponse(res, 404, 'NOT_FOUND');
        ticket = page.ticket;
        if (firstPage) {
          initialAssignedTaId = ticket.claimedByTaId;
          firstPage = false;
        } else if (ticket.claimedByTaId !== initialAssignedTaId) {
          return errorResponse(res, 503, 'AI_UNAVAILABLE');
        }
        replyCandidates.push(...page.replies);
        const assignedTaId = ticket.claimedByTaId;
        const eligibleReplies = replyCandidates
          .filter((reply) => reply.authorUserId === auth.session.userId || (assignedTaId && reply.authorUserId === assignedTaId))
          .map((reply) => ({ message: reply.message }));
        const partialTicket = Object.fromEntries(ticketFields
          .filter((field) => Object.hasOwn(ticket, field)).map((field) => [field, ticket[field]]));
        const redactedPrefix = redact(serializeInput({
          page: 'detail', question, history, ticket: { ...partialTicket, replies: eligibleReplies },
        }));
        if (redactedPrefix.length > MAX_INPUT_CHARS + REDACTION_BOUNDARY_MARGIN) {
          return errorResponse(res, 413, 'AI_INPUT_TOO_LARGE');
        }
        if (page.hasMore === true && !page.pageCursor) return errorResponse(res, 503, 'AI_UNAVAILABLE');
        cursor = page.hasMore === true ? page.pageCursor : undefined;
      } while (cursor);

      const gateway = req.app.locals.aiGateway;
      if (!gateway || typeof gateway.run !== 'function') return errorResponse(res, 503, 'AI_UNAVAILABLE');
      const ticketContext = Object.fromEntries(ticketFields
        .filter((field) => Object.hasOwn(ticket, field)).map((field) => [field, ticket[field]]));
      const replies = replyCandidates
        .filter((reply) => reply.authorUserId === auth.session.userId || (ticket.claimedByTaId && reply.authorUserId === ticket.claimedByTaId))
        .map((reply) => ({ message: reply.message }));
      const finalContext = serializeInput({ page: 'detail', question, history, ticket: { ...ticketContext, replies } });
      if (!redactAndCap(finalContext, MAX_INPUT_CHARS).ok) return errorResponse(res, 413, 'AI_INPUT_TOO_LARGE');
      const result = await gateway.run({
        feature: FEATURE,
        actor: { userId: auth.session.userId, accountType: 'STUDENT' },
        input: { page: 'detail', question, history, ticket: { ...ticketContext, replies } },
      });
      if (!result || result.ok !== true || !result.data) {
        const code = result && ['AI_RATE_LIMITED', 'AI_INPUT_TOO_LARGE', 'AI_INVALID_OUTPUT'].includes(result.code) ? result.code : 'AI_UNAVAILABLE';
        return errorResponse(res, code === 'AI_RATE_LIMITED' ? 429 : code === 'AI_INPUT_TOO_LARGE' ? 413 : 503, code);
      }
      return res.status(200).json({ reply: result.data });
    } catch {
      return errorResponse(res, 503, 'AI_UNAVAILABLE');
    }
  });
  router.use((error, req, res, next) => {
    if (!req.path.endsWith('/help-chat')) return next(error);
    if (error && error.type === 'entity.too.large') return errorResponse(res, 413, 'REQUEST_TOO_LARGE');
    if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) return errorResponse(res, 400, 'INVALID_REQUEST');
    return errorResponse(res, 503, 'AI_UNAVAILABLE');
  });
  return router;
}

module.exports = { MAX_BODY_BYTES, REDACTION_BOUNDARY_MARGIN, validateCreateChat, createStudentHelpChatRouter };
