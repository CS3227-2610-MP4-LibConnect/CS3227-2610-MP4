// TA reply sub-router (spec ta-ticket-queue v0.1, R5 and the TICKET_REPLY row of R7).
// Mounted by ta-routes.js after the TA guards, so `req.actor` is a verified active TA.
const express = require('express');
const { MAX_REPLY_LENGTH, TICKET_ID_PATTERN } = require('./constants');
const { toIsoString } = require('./ta-views');
const { isPlainObject } = require('./ta-claims');

/** Returns the trimmed message when the body is exactly `{ message }` and valid, else `null`. */
function parseReplyBody(body) {
  if (!isPlainObject(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'message' || typeof body.message !== 'string') return null;
  const message = body.message.trim();
  return message.length >= 1 && message.length <= MAX_REPLY_LENGTH ? message : null;
}

function createTaRepliesRoutes({ requireCsrf, ticketStore, accountStore, notify, safe, messages }) {
  const router = express.Router();

  router.post('/:ticketId/replies', requireCsrf, safe(async (req, res) => {
    const { ticketId } = req.params;
    if (!TICKET_ID_PATTERN.test(ticketId)) return res.status(404).json({ message: messages.NOT_FOUND });
    const message = parseReplyBody(req.body);
    if (message === null) return res.status(400).json({ message: messages.INVALID });

    // Author id and timestamp come from the session and the store, never from the client.
    const result = await ticketStore.addReply(ticketId, { authorUserId: req.actor.userId, message });
    if (!result || !result.ok) {
      if (result && result.reason === 'NOT_FOUND') return res.status(404).json({ message: messages.NOT_FOUND });
      return res.status(409).json({ message: 'This ticket can no longer accept replies.' });
    }

    const reply = result.reply || {};
    const ticket = result.ticket || {};
    // Notify only after the commit; a failure here must never fail the already-committed reply.
    try {
      await notify({
        recipientUserId: ticket.studentId,
        notificationType: 'TICKET_REPLY',
        ticketId,
        message: `A TA replied to "${ticket.title}".`,
      });
    } catch (error) {
      // Notification is best-effort by contract.
    }

    const author = req.actor;
    let name = typeof author.name === 'string' ? author.name : null;
    if (name === null) {
      try {
        const account = await accountStore.getAccount(author.userId);
        name = account && typeof account.name === 'string' ? account.name : null;
      } catch (error) {
        name = null;
      }
    }
    return res.status(201).json({
      replyId: reply.replyId,
      message: reply.message,
      createdAt: toIsoString(reply.createdAt),
      authorName: name || 'Unknown user',
      authorRole: 'TA',
      isMine: true,
    });
  }));

  return router;
}

module.exports = { createTaRepliesRoutes };
