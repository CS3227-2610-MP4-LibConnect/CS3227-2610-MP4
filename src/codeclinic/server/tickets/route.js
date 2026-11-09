const crypto = require('crypto');
const express = require('express');
const { createSessionAuthenticator, hashSubmittedCsrf } = require('../auth/login');
const { validateTicketInput } = require('./validation');

const MAX_BODY_BYTES = 128 * 1024;
const RETRY_MESSAGE = 'Ticket service is temporarily unavailable. Please try again.';
const AUTH_REQUIRED = 'Authentication required.';
const NOT_VERIFIED = 'Request could not be verified.';
const FORBIDDEN = 'You do not have permission to do that.';

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

  // Handle parser failures locally, before the existing login app's 8 KiB parser.
  router.use((error, req, res, next) => {
    if (error && error.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Request body is too large.' });
    }
    if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
      return res.status(400).json({ message: 'Enter valid ticket details.' });
    }
    return next(error);
  });
  return router;
}

module.exports = { MAX_BODY_BYTES, createTicketsRouter };
