const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const express = require('express');
const request = require('supertest');
const { createNotificationsRouter, PAGE_SIZE } = require('../server/notifications/route');
const { createServerApp } = require('../server');

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const { SESSION_COOKIE: COOKIE } = require('../server/auth/login');
const T0 = Date.UTC(2026, 10, 8, 9, 0, 0);

function makeSystem() {
  const users = new Map();
  const sessions = new Map();
  const notifications = new Map();
  let storeError = null;
  let authError = null;

  const repository = {
    async getUserById(userId) {
      if (authError) throw authError;
      return users.get(userId) || null;
    },
  };
  const authStore = {
    async getSession(idHash) {
      if (authError) throw authError;
      return sessions.get(idHash) || null;
    },
    async touchSession(idHash) { return sessions.has(idHash); },
    async deleteSession(idHash) { sessions.delete(idHash); },
  };
  const guard = () => { if (storeError) throw storeError; };
  const store = {
    async getById(id) { guard(); return notifications.get(id) || null; },
    async listForRecipient(userId, afterId, limit) {
      guard();
      const own = [...notifications.values()]
        .filter((n) => n.recipientUserId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      const start = afterId ? own.findIndex((n) => n.notificationId === afterId) + 1 : 0;
      return own.slice(start, start + limit);
    },
    async countUnread(userId, max) {
      guard();
      return Math.min(max, [...notifications.values()].filter((n) => n.recipientUserId === userId && !n.read).length);
    },
    async markRead(id) { guard(); notifications.get(id).read = true; },
    async markAllRead(userId) {
      guard();
      notifications.forEach((n) => { if (n.recipientUserId === userId) n.read = true; });
    },
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', createNotificationsRouter({ repository, authStore, store }));

  function addUser(userId, accountType = 'STUDENT') {
    users.set(userId, { userId, accountType, accountStatus: 'ACTIVE' });
    const rawId = crypto.randomBytes(32).toString('base64url');
    const csrf = crypto.randomBytes(32).toString('base64url');
    sessions.set(sha256(rawId), { userId, accountTypeAtIssue: accountType, csrfTokenHash: sha256(csrf) });
    return { cookie: `${COOKIE}=${rawId}`, csrf };
  }

  function addNotifications(userId, count, { prefix = userId, read = false, offset = 0 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const notificationId = `${prefix}-n${i + offset}`;
      notifications.set(notificationId, {
        notificationId,
        recipientUserId: userId,
        notificationType: 'TICKET_REPLY',
        ticketId: `ticket-${i}`,
        message: `Reply ${i + offset}`,
        createdAt: new Date(T0 + (i + offset) * 1000),
        read,
      });
    }
  }

  return {
    app, users, sessions, notifications, addUser, addNotifications,
    failStorage(error = new Error('synthetic')) { storeError = error; },
    failAuth(error = new Error('synthetic')) { authError = error; },
  };
}

describe('authentication and role recheck', () => {
  const routes = [
    ['get', '/api/notifications'],
    ['get', '/api/notifications/unread-count'],
    ['post', '/api/notifications/read-all'],
    ['post', '/api/notifications/x-n0/read'],
  ];

  test.each(routes)('%s %s without a session returns 401', async (method, url) => {
    const system = makeSystem();
    const response = await request(system.app)[method](url);
    expect(response.status).toBe(401);
  });

  test.each(routes)('%s %s with an inactive account returns 401 and ends the session', async (method, url) => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.users.get('alice').accountStatus = 'INACTIVE';
    const response = await request(system.app)[method](url).set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(response.status).toBe(401);
    expect(system.sessions.size).toBe(0);
  });

  test('a role change since sign-in returns 401', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice', 'STUDENT');
    system.users.get('alice').accountType = 'TA';
    const response = await request(system.app).get('/api/notifications').set('Cookie', alice.cookie);
    expect(response.status).toBe(401);
  });

  test('a session store failure returns 503', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.failAuth();
    const response = await request(system.app).get('/api/notifications').set('Cookie', alice.cookie);
    expect(response.status).toBe(503);
  });
});

describe('GET /api/notifications', () => {
  test('returns only own notifications, newest first, 20 per page across pages', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addUser('bob');
    system.addNotifications('alice', 45);
    system.addNotifications('bob', 5);

    const seen = [];
    let cursor;
    let pages = 0;
    do {
      const url = cursor ? `/api/notifications?cursor=${encodeURIComponent(cursor)}` : '/api/notifications';
      const response = await request(system.app).get(url).set('Cookie', alice.cookie);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body.notifications.length).toBeLessThanOrEqual(PAGE_SIZE);
      seen.push(...response.body.notifications);
      cursor = response.body.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toHaveLength(45);
    expect(seen.every((n) => n.notificationId.startsWith('alice-'))).toBe(true);
    const times = seen.map((n) => Date.parse(n.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(seen[0]).toEqual({
      notificationId: 'alice-n44', notificationType: 'TICKET_REPLY', ticketId: 'ticket-44',
      message: 'Reply 44', createdAt: new Date(T0 + 44000).toISOString(), read: false,
    });
    expect(seen[0]).not.toHaveProperty('recipientUserId');
  });

  test('an exact page has no next cursor and an empty inbox returns an empty list', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    const empty = await request(system.app).get('/api/notifications').set('Cookie', alice.cookie);
    expect(empty.body).toEqual({ notifications: [], nextCursor: null });
    system.addNotifications('alice', 20);
    const full = await request(system.app).get('/api/notifications').set('Cookie', alice.cookie);
    expect(full.body.notifications).toHaveLength(20);
    expect(full.body.nextCursor).toBeNull();
  });

  test('ignores client-supplied owner fields', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('bob', 3);
    const response = await request(system.app)
      .get('/api/notifications?recipientUserId=bob&userId=bob')
      .set('Cookie', alice.cookie);
    expect(response.status).toBe(200);
    expect(response.body.notifications).toEqual([]);
  });

  test.each([
    ['a malformed cursor', 'bad cursor!'],
    ['an unknown cursor', 'alice-n999'],
    ['another user\'s notification as cursor', 'bob-n0'],
  ])('%s returns 400', async (_label, cursor) => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 3);
    system.addNotifications('bob', 3);
    const response = await request(system.app)
      .get(`/api/notifications?cursor=${encodeURIComponent(cursor)}`)
      .set('Cookie', alice.cookie);
    expect(response.status).toBe(400);
  });

  test('a repeated cursor parameter returns 400', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    const response = await request(system.app).get('/api/notifications?cursor=a&cursor=b').set('Cookie', alice.cookie);
    expect(response.status).toBe(400);
  });

  test('a storage failure returns 503', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.failStorage();
    const response = await request(system.app).get('/api/notifications').set('Cookie', alice.cookie);
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain('synthetic');
  });
});

describe('GET /api/notifications/unread-count', () => {
  test('counts own unread notifications only', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 3);
    system.addNotifications('alice', 2, { prefix: 'alice-read', read: true });
    system.addNotifications('bob', 7);
    const response = await request(system.app).get('/api/notifications/unread-count').set('Cookie', alice.cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 3 });
  });

  test('caps the count at 99', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 150);
    const response = await request(system.app).get('/api/notifications/unread-count').set('Cookie', alice.cookie);
    expect(response.body).toEqual({ unreadCount: 99 });
  });

  test('a storage failure returns 503', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.failStorage();
    const response = await request(system.app).get('/api/notifications/unread-count').set('Cookie', alice.cookie);
    expect(response.status).toBe(503);
  });
});

describe('POST /api/notifications/:id/read', () => {
  test('marks an own notification read', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 2);
    const response = await request(system.app).post('/api/notifications/alice-n0/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(response.status).toBe(204);
    expect(system.notifications.get('alice-n0').read).toBe(true);
    expect(system.notifications.get('alice-n1').read).toBe(false);
    const again = await request(system.app).post('/api/notifications/alice-n0/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(again.status).toBe(204);
  });

  test('another user\'s notification returns the same 404 as a missing one and changes nothing', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('bob', 1);
    const other = await request(system.app).post('/api/notifications/bob-n0/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    const missing = await request(system.app).post('/api/notifications/nobody-n0/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    const malformed = await request(system.app).post('/api/notifications/bad%20id/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(other.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(other.body).toEqual(missing.body);
    expect(system.notifications.get('bob-n0').read).toBe(false);
  });

  test.each([
    ['no token', undefined],
    ['a wrong token', 'x'.repeat(43)],
    ['another user\'s token', 'BOB'],
  ])('%s returns 403 and changes nothing', async (_label, token) => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    const bob = system.addUser('bob');
    system.addNotifications('alice', 1);
    let call = request(system.app).post('/api/notifications/alice-n0/read').set('Cookie', alice.cookie);
    if (token) call = call.set('X-CSRF-Token', token === 'BOB' ? bob.csrf : token);
    const response = await call;
    expect(response.status).toBe(403);
    expect(system.notifications.get('alice-n0').read).toBe(false);
  });

  test('a storage failure returns 503', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 1);
    system.failStorage();
    const response = await request(system.app).post('/api/notifications/alice-n0/read')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(response.status).toBe(503);
  });
});

describe('POST /api/notifications/read-all', () => {
  test('marks all own notifications read, sets the unread count to 0, and leaves others unchanged', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 30);
    system.addNotifications('bob', 4);
    const response = await request(system.app).post('/api/notifications/read-all')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(response.status).toBe(204);
    const count = await request(system.app).get('/api/notifications/unread-count').set('Cookie', alice.cookie);
    expect(count.body).toEqual({ unreadCount: 0 });
    expect([...system.notifications.values()].filter((n) => n.recipientUserId === 'bob' && !n.read)).toHaveLength(4);
  });

  test('a missing CSRF token returns 403 and changes nothing', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.addNotifications('alice', 2);
    const response = await request(system.app).post('/api/notifications/read-all').set('Cookie', alice.cookie);
    expect(response.status).toBe(403);
    expect([...system.notifications.values()].every((n) => !n.read)).toBe(true);
  });

  test('a storage failure returns 503', async () => {
    const system = makeSystem();
    const alice = system.addUser('alice');
    system.failStorage();
    const response = await request(system.app).post('/api/notifications/read-all')
      .set('Cookie', alice.cookie).set('X-CSRF-Token', alice.csrf);
    expect(response.status).toBe(503);
  });
});

test('createServerApp mounts the inbox API behind authentication', async () => {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeclinic-notifications-'));
  try {
    const db = { collection: () => { throw new Error('unexpected storage access'); } };
    const authStore = {
      async reserveRateSlot() { return true; },
      async releaseRateSlot() {},
      async createSession() {},
      async getSession() { return null; },
      async touchSession() { return false; },
      async rotateCsrfToken() {},
      async deleteSession() {},
      async deleteSessionIfCsrfMatches() { return false; },
    };
    const app = createServerApp(db, buildDirectory, authStore, { async createAccount() {} });
    const response = await request(app).get('/api/notifications/unread-count');
    expect(response.status).toBe(401);
  } finally {
    fs.rmSync(buildDirectory, { recursive: true, force: true });
  }
});
