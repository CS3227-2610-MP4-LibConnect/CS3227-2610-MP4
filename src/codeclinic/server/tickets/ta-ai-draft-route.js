// POST /:ticketId/fix-note-draft (spec ai-ta-assist v0.2, R2, R5; scenarios 1, 2, 3, 7, 9, 11).
// Mounted by `ta-routes.js`, which has already run `requireActiveActor` and the TA check.
// Only the CLAIMED ticket's current claimer may ask for a draft; the decision uses the store's
// status and claimedByTaId plus the session actor, never client fields. The route reads and returns
// text only: no store writes and no notifications. The gateway is read per request.
const express = require('express');
const { toIsoString, createUserLookup } = require('./ta-views');
const { FIX_NOTE_DRAFTER } = require('./ta-ai-fix-note');
const { QUEUE_INSIGHTS } = require('./ta-ai-insights');
const { toAiErrorResponse, requireEmptyJsonBody } = require('./ta-ai-shared');

const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FEATURE = 'FIX_NOTE_DRAFTER';
const CONFLICT_MESSAGE = 'This ticket can no longer be changed that way. Refresh and try again.';

/** Registers both TA AI feature definitions with the gateway (called once from startServer). */
function registerTaAiFeatures(gateway) {
  gateway.register(FIX_NOTE_DRAFTER);
  gateway.register(QUEUE_INSIGHTS);
}

/** Copies only the fields the drafter prompt uses; no names, emails, IDs, ticketId, or repoUrl. */
async function toDraftInput(ticket, lookup) {
  const replies = [];
  for (const r of Array.isArray(ticket.replies) ? ticket.replies : []) {
    // The role comes from the author's stored account, never from the reply or the client.
    const author = await lookup(r && r.authorUserId);
    replies.push({
      message: r && r.message,
      authorRole: author && author.accountType === 'TA' ? 'TA' : 'STUDENT',
      createdAt: toIsoString(r && r.createdAt),
    });
  }
  return {
    title: ticket.title,
    language: ticket.language,
    conceptTags: ticket.conceptTags,
    errorOutput: ticket.errorOutput,
    expectedBehaviour: ticket.expectedBehaviour,
    actualBehaviour: ticket.actualBehaviour,
    attempted: ticket.attempted,
    files: (Array.isArray(ticket.files) ? ticket.files : []).map((f) => ({ name: f && f.name, content: f && f.content })),
    replies,
  };
}

function sendAiError(res, code) {
  const mapped = toAiErrorResponse(code, FEATURE);
  return res.status(mapped.status).json(mapped.body);
}

/** @param {{ requireCsrf: Function, ticketStore: object, accountStore: object, safe: Function, messages: object }} shared */
function createAiDraftRoutes(shared) {
  const { requireCsrf, ticketStore, accountStore, safe, messages } = shared;
  const router = express.Router();

  router.post('/:ticketId/fix-note-draft', requireCsrf, requireEmptyJsonBody, safe(async (req, res) => {
    const { ticketId } = req.params;
    if (!TICKET_ID_PATTERN.test(ticketId)) return res.status(404).json({ message: messages.NOT_FOUND });
    const ticket = await ticketStore.getTicket(ticketId);
    if (!ticket) return res.status(404).json({ message: messages.NOT_FOUND });
    if (ticket.status !== 'CLAIMED' || ticket.claimedByTaId !== req.actor.userId) {
      return res.status(409).json({ message: CONFLICT_MESSAGE });
    }
    const gateway = req.app.locals.aiGateway;
    if (!gateway || typeof gateway.run !== 'function') return sendAiError(res, 'AI_UNAVAILABLE');
    let result;
    try {
      result = await gateway.run({
        feature: FEATURE,
        actor: { userId: req.actor.userId, accountType: req.actor.accountType },
        input: await toDraftInput(ticket, createUserLookup(accountStore)),
      });
    } catch (error) {
      return sendAiError(res, 'AI_UNAVAILABLE');
    }
    if (!result || result.ok !== true || !result.data || typeof result.data.draft !== 'string') {
      return sendAiError(res, result && result.ok === false ? result.code : 'AI_INVALID_OUTPUT');
    }
    return res.status(200).json({ draft: result.data.draft });
  }));

  return router;
}

module.exports = { createAiDraftRoutes, registerTaAiFeatures };
