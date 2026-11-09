// TA claim, unclaim, and resolve endpoints (spec ta-ticket-queue v0.1, R3, R4, R6, R7).
// Mounted by `ta-routes.js`, which has already run `requireActiveActor` and the TA check.
// State changes happen only inside the store's transactional methods; notifications are sent
// after a successful commit and can never fail the action.
const express = require('express');
const { MAX_FIX_NOTE_LENGTH } = require('./constants');
const { createUserLookup, toDetailView } = require('./ta-views');

const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const CONFLICT_MESSAGE = 'This ticket can no longer be changed that way. Refresh and try again.';

const NOTIFICATIONS = Object.freeze({
  claim: { notificationType: 'TICKET_CLAIMED', message: (title) => `A TA is now helping with "${title}".` },
  resolve: { notificationType: 'TICKET_RESOLVED', message: (title) => `"${title}" was resolved.` },
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The body must be absent or an object with no own keys. */
function isEmptyBody(body, headers) {
  if (body === undefined) {
    // A body that was sent but not parsed as a JSON object (text/plain, form) is rejected, not ignored.
    const length = Number(headers && headers['content-length']);
    return !(length > 0) && !(headers && headers['transfer-encoding']);
  }
  return isPlainObject(body) && Object.keys(body).length === 0;
}

/** Returns the trimmed note, or `null` if the body is not exactly `{ fixNote }` of 1-2000 characters. */
function parseResolveBody(body) {
  if (!isPlainObject(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'fixNote' || typeof body.fixNote !== 'string') return null;
  const fixNote = body.fixNote.trim();
  return fixNote.length >= 1 && fixNote.length <= MAX_FIX_NOTE_LENGTH ? fixNote : null;
}

/** @param {{ requireCsrf: Function, ticketStore: object, accountStore: object, notify: Function, safe: Function, messages: object }} shared */
function createClaimRoutes(shared) {
  const { requireCsrf, ticketStore, accountStore, notify, safe, messages } = shared;
  const router = express.Router();

  /** Sends the fixed-template notification only after commit; any failure is swallowed. */
  async function notifyStudent(action, ticket) {
    const template = NOTIFICATIONS[action];
    if (!template || typeof ticket.studentId !== 'string') return;
    try {
      await notify({
        recipientUserId: ticket.studentId,
        notificationType: template.notificationType,
        ticketId: ticket.ticketId,
        message: template.message(ticket.title),
      });
    } catch (error) {
      // A notification failure never fails or rolls back the action (R7).
    }
  }

  function action(path, event, parseBody, run) {
    router.post(path, requireCsrf, safe(async (req, res) => {
      const { ticketId } = req.params;
      const parsed = parseBody(req.body, req.headers);
      if (parsed === null) return res.status(400).json({ message: messages.INVALID });
      if (!TICKET_ID_PATTERN.test(ticketId)) return res.status(404).json({ message: messages.NOT_FOUND });
      const result = await run(ticketId, req.actor.userId, parsed.value);
      if (!result.ok) {
        return result.reason === 'NOT_FOUND'
          ? res.status(404).json({ message: messages.NOT_FOUND })
          : res.status(409).json({ message: CONFLICT_MESSAGE });
      }
      await notifyStudent(event, result.ticket);
      return res.status(200).json(await toDetailView(result.ticket, req.actor.userId, createUserLookup(accountStore)));
    }));
  }

  const emptyBody = (body, headers) => (isEmptyBody(body, headers) ? { value: undefined } : null);
  const resolveBody = (body) => {
    const fixNote = parseResolveBody(body);
    return fixNote === null ? null : { value: fixNote };
  };

  action('/:ticketId/claim', 'claim', emptyBody, (id, actorId) => ticketStore.claimTicket(id, actorId));
  action('/:ticketId/unclaim', 'unclaim', emptyBody, (id, actorId) => ticketStore.unclaimTicket(id, actorId));
  action('/:ticketId/resolve', 'resolve', resolveBody, (id, actorId, note) => ticketStore.resolveTicket(id, actorId, note));

  return router;
}

module.exports = { createClaimRoutes };
