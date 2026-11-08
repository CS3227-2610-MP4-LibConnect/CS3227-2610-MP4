const crypto = require('crypto');
const express = require('express');
const { NOTIFICATIONS_COLLECTION } = require('./notify');
const { createSessionAuthenticator, hashSubmittedCsrf } = require('../auth/login');

const PAGE_SIZE = 20;
const UNREAD_CAP = 99;
const MARK_ALL_BATCH = 400;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const RETRY_MESSAGE = 'Notifications are temporarily unavailable. Please try again.';

/**
 * @typedef {{ notificationId: string, recipientUserId: string, notificationType: string,
 *   ticketId: string, message: string, createdAt: unknown, read: boolean }} NotificationRecord
 * @typedef {{
 *   getById(notificationId: string): Promise<NotificationRecord|null>,
 *   listForRecipient(userId: string, afterId: string|null, limit: number): Promise<NotificationRecord[]>,
 *   countUnread(userId: string, max: number): Promise<number>,
 *   markRead(notificationId: string): Promise<void>,
 *   markAllRead(userId: string): Promise<void>,
 * }} NotificationStore
 */

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

function toResponseItem(record) {
  return {
    notificationId: record.notificationId,
    notificationType: record.notificationType,
    ticketId: record.ticketId,
    message: record.message,
    createdAt: toIsoString(record.createdAt),
    read: record.read === true,
  };
}

/** @returns {NotificationStore} */
function createFirestoreNotificationStore(db) {
  const collection = () => db.collection(NOTIFICATIONS_COLLECTION);
  return {
    async getById(notificationId) {
      const snapshot = await collection().doc(notificationId).get();
      return snapshot.exists ? { ...snapshot.data(), notificationId: snapshot.id } : null;
    },
    async listForRecipient(userId, afterId, limit) {
      let query = collection().where('recipientUserId', '==', userId).orderBy('createdAt', 'desc');
      if (afterId) query = query.startAfter(await collection().doc(afterId).get());
      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map((doc) => ({ ...doc.data(), notificationId: doc.id }));
    },
    async countUnread(userId, max) {
      const snapshot = await collection().where('recipientUserId', '==', userId)
        .where('read', '==', false).select().limit(max).get();
      return snapshot.size;
    },
    async markRead(notificationId) {
      await collection().doc(notificationId).update({ read: true });
    },
    async markAllRead(userId) {
      for (;;) {
        const snapshot = await collection().where('recipientUserId', '==', userId)
          .where('read', '==', false).select().limit(MARK_ALL_BATCH).get();
        if (snapshot.empty) return;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
        await batch.commit();
        if (snapshot.size < MARK_ALL_BATCH) return;
      }
    },
  };
}

/**
 * Inbox API. The recipient is always the session's `userId`; client-supplied
 * notification IDs and cursors are checked against it on the server.
 * @param {{ repository: { getUserById(userId: string): Promise<unknown> },
 *   authStore: { getSession(idHash: string): Promise<any>, touchSession(idHash: string, clock: () => number): Promise<boolean>, deleteSession(idHash: string): Promise<void> },
 *   store: NotificationStore, now?: () => number }} deps
 */
function createNotificationsRouter({ repository, authStore, store, now = Date.now }) {
  if (!repository || typeof repository.getUserById !== 'function' ||
      !authStore || typeof authStore.getSession !== 'function' ||
      typeof authStore.touchSession !== 'function' || typeof authStore.deleteSession !== 'function' ||
      !store || ['getById', 'listForRecipient', 'countUnread', 'markRead', 'markAllRead']
        .some((name) => typeof store[name] !== 'function')) {
    throw new TypeError('Notification router dependencies are required.');
  }

  const authenticateRequest = createSessionAuthenticator(repository, authStore, now);

  async function authenticate(req) {
    const auth = await authenticateRequest(req);
    return auth ? { userId: auth.session.userId, csrfTokenHash: auth.session.csrfTokenHash } : null;
  }

  function csrfMatches(req, auth) {
    const submitted = hashSubmittedCsrf(req);
    const stored = auth.csrfTokenHash;
    if (!/^[a-f0-9]{64}$/.test(submitted) || typeof stored !== 'string' || !/^[a-f0-9]{64}$/.test(stored)) return false;
    return crypto.timingSafeEqual(Buffer.from(submitted, 'hex'), Buffer.from(stored, 'hex'));
  }

  /** Wraps a handler with authentication, optional CSRF, and the `503` fallback. */
  function guarded(handler, { requireCsrf = false } = {}) {
    return async (req, res) => {
      res.set('Cache-Control', 'no-store');
      try {
        const auth = await authenticate(req);
        if (!auth) return res.status(401).json({ message: 'Authentication required.' });
        if (requireCsrf && !csrfMatches(req, auth)) {
          return res.status(403).json({ message: 'Request could not be verified.' });
        }
        return await handler(req, res, auth.userId);
      } catch (error) {
        return res.status(503).json({ message: RETRY_MESSAGE });
      }
    };
  }

  const router = express.Router();

  router.get('/', guarded(async (req, res, userId) => {
    const { cursor } = req.query;
    let afterId = null;
    if (cursor !== undefined && cursor !== '') {
      if (typeof cursor !== 'string' || !ID_PATTERN.test(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor.' });
      }
      const anchor = await store.getById(cursor);
      if (!anchor || anchor.recipientUserId !== userId) {
        return res.status(400).json({ message: 'Invalid cursor.' });
      }
      afterId = cursor;
    }
    const records = await store.listForRecipient(userId, afterId, PAGE_SIZE + 1);
    const own = records.filter((record) => record && record.recipientUserId === userId);
    const page = own.slice(0, PAGE_SIZE);
    const nextCursor = own.length > PAGE_SIZE ? page[page.length - 1].notificationId : null;
    return res.status(200).json({ notifications: page.map(toResponseItem), nextCursor });
  }));

  router.get('/unread-count', guarded(async (req, res, userId) => {
    const count = await store.countUnread(userId, UNREAD_CAP + 1);
    return res.status(200).json({ unreadCount: Math.min(Math.max(0, count), UNREAD_CAP) });
  }));

  router.post('/read-all', guarded(async (req, res, userId) => {
    await store.markAllRead(userId);
    return res.status(204).end();
  }, { requireCsrf: true }));

  router.post('/:id/read', guarded(async (req, res, userId) => {
    const { id } = req.params;
    const notFound = () => res.status(404).json({ message: 'Notification not found.' });
    if (!ID_PATTERN.test(id)) return notFound();
    const record = await store.getById(id);
    if (!record || record.recipientUserId !== userId) return notFound();
    if (record.read !== true) await store.markRead(id);
    return res.status(204).end();
  }, { requireCsrf: true }));

  return router;
}

module.exports = {
  PAGE_SIZE,
  UNREAD_CAP,
  createFirestoreNotificationStore,
  createNotificationsRouter,
};
