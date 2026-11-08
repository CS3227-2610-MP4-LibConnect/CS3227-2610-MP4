const crypto = require('crypto');

const NOTIFICATION_TYPES = Object.freeze(['TICKET_CLAIMED', 'TICKET_REPLY', 'TICKET_RESOLVED', 'SESSION_UPDATE']);
const MAX_MESSAGE_LENGTH = 300;
const MAX_ID_LENGTH = 128;
const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * @typedef {'TICKET_CLAIMED'|'TICKET_REPLY'|'TICKET_RESOLVED'|'SESSION_UPDATE'} NotificationType
 * @typedef {{ recipientUserId: string, notificationType: NotificationType, ticketId: string, message: string }} NotifyInput
 * @typedef {{ ok: true, notificationId: string } | { ok: false, reason: 'INVALID_INPUT'|'WRITE_FAILED'|'NOT_CONFIGURED' }} NotifyResult
 */

function isBoundedId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_ID_LENGTH;
}

/** Counts characters by code point so the cap never splits a surrogate pair. */
function capMessage(message) {
  return Array.from(message.trim()).slice(0, MAX_MESSAGE_LENGTH).join('');
}

/** @param {unknown} input @returns {NotifyInput|null} */
function validateNotifyInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { recipientUserId, notificationType, ticketId, message } = input;
  if (!isBoundedId(recipientUserId) || !isBoundedId(ticketId)) return null;
  if (!NOTIFICATION_TYPES.includes(notificationType)) return null;
  if (typeof message !== 'string') return null;
  return { recipientUserId, notificationType, ticketId, message: capMessage(message) };
}

/**
 * Returns a `notify` function bound to a Firestore-compatible `db`. The
 * returned function never throws: a failed write is retried once, then
 * reported in the result and a log line that carries no message, user, or
 * ticket data.
 */
function createNotify(db, options = {}) {
  const now = options.now || Date.now;
  const newId = options.newId || (() => crypto.randomUUID());
  const logger = options.logger || console;

  /** @param {NotifyInput} input @returns {Promise<NotifyResult>} */
  return async function notify(input) {
    const valid = validateNotifyInput(input);
    if (!valid) return { ok: false, reason: 'INVALID_INPUT' };
    if (!db || typeof db.collection !== 'function') {
      safeLog(logger, 'notify: notification store is not configured.');
      return { ok: false, reason: 'NOT_CONFIGURED' };
    }

    let notificationId;
    let record;
    try {
      notificationId = newId();
      record = { notificationId, ...valid, createdAt: new Date(now()), read: false };
    } catch (error) {
      safeLog(logger, 'notify: notification could not be prepared.');
      return { ok: false, reason: 'WRITE_FAILED' };
    }

    // `set` on a fixed ID keeps the retry idempotent if the first write landed.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId).set(record);
        return { ok: true, notificationId };
      } catch (error) {
        if (attempt === 2) {
          safeLog(logger, 'notify: notification write failed after retry.');
        }
      }
    }
    return { ok: false, reason: 'WRITE_FAILED' };
  };
}

function safeLog(logger, line) {
  try {
    logger.warn(line);
  } catch (error) { /* logging must never fail the caller */ }
}

let configuredNotify = createNotify(null);

/** Binds the shared `notify` export to the server's Firestore instance. */
function configureNotify(db, options) {
  configuredNotify = createNotify(db, options);
}

/** @param {NotifyInput} input @returns {Promise<NotifyResult>} */
function notify(input) {
  return configuredNotify(input);
}

module.exports = {
  NOTIFICATION_TYPES,
  MAX_MESSAGE_LENGTH,
  NOTIFICATIONS_COLLECTION,
  validateNotifyInput,
  createNotify,
  configureNotify,
  notify,
};
