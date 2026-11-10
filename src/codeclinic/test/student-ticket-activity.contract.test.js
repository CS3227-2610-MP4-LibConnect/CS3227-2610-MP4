const express = require('express');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const { createTicketsRouter } = require('../server/tickets/route');
const { createFirestoreTicketStore } = require('../server/tickets/store');

describe('active ticket query contract', () => {
  test('filters by owner and active status in Firestore, orders with a stable tie-breaker, and limits before reading', async () => {
    const operations = [];
    const docs = [
      { id: 'ticket-a', data: () => ({ ticketId: 'ticket-a', updatedAt: 'same-time' }) },
      { id: 'ticket-b', data: () => ({ ticketId: 'ticket-b', updatedAt: 'same-time' }) },
    ];
    const query = {
      where(field, operator, value) { operations.push(['where', field, operator, value]); return this; },
      orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
      limit(value) { operations.push(['limit', value]); return this; },
      async get() { operations.push(['get']); return { docs }; },
    };
    const store = createFirestoreTicketStore({ collection(name) { operations.push(['collection', name]); return query; } });
    const result = await store.listActive('student-a');
    expect(operations.slice(0, 4)).toEqual([
      ['collection', 'tickets'], ['where', 'studentId', '==', 'student-a'],
      ['where', 'status', 'in', ['OPEN', 'CLAIMED']], ['orderBy', 'updatedAt', 'desc'],
    ]);
    const orderByOperations = operations.filter(([name]) => name === 'orderBy');
    expect(orderByOperations.length).toBeGreaterThanOrEqual(2);
    expect(orderByOperations[1][2]).toMatch(/asc/i);
    expect(operations.some(([name, value]) => name === 'limit' && value === 5)).toBe(true);
    expect(operations[operations.length - 1]).toEqual(['get']);
    expect(result).toEqual(docs.map((doc) => doc.data()));
    expect(result.map(({ ticketId }) => ticketId)).toEqual(['ticket-a', 'ticket-b']);
  });
});

function createRouter({ store = {}, account = { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' }, repository: suppliedRepository } = {}) {
  const sessions = new Map();
  const token = 'synthetic-session-token-for-ticket-activity';
  const csrf = 'synthetic-csrf-token';
  const crypto = require('crypto');
  const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  sessions.set(sha256(token), { userId: account.userId, accountTypeAtIssue: account.accountType, csrfTokenHash: sha256(csrf) });
  const repository = suppliedRepository || { async getUserById(id) { return id === account.userId ? account : null; } };
  const authStore = {
    async getSession(hash) { return sessions.get(hash) || null; },
    async touchSession() { return true; },
    async deleteSession() {},
  };
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ repository, authStore, store }));
  return { app, cookie: `__Host-codeclinic_session=${token}`, csrf };
}

describe('Student ticket activity API contract', () => {
  test('active summaries are available only to an authenticated Student and are not cacheable', async () => {
    const listActive = jest.fn().mockResolvedValue([]);
    const { app, cookie } = createRouter({ store: { create: jest.fn(), listActive } });
    const visitor = await request(app).get('/api/tickets/active');
    const student = await request(app).get('/api/tickets/active').set('Cookie', cookie);
    expect(visitor.status).toBe(401);
    expect(student.status).toBe(200);
    expect(student.headers['cache-control']).toBe('no-store');
    expect(listActive).toHaveBeenCalledTimes(1);
    expect(listActive).toHaveBeenCalledWith('student-a');
  });

  test('active summaries deny TAs and inactive Students without querying tickets', async () => {
    const listActive = jest.fn().mockResolvedValue([]);
    const ta = createRouter({ account: { userId: 'ta-a', accountType: 'TA', accountStatus: 'ACTIVE' },
      store: { create: jest.fn(), listActive } });
    const inactive = createRouter({ account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'INACTIVE' },
      store: { create: jest.fn(), listActive } });
    expect((await request(ta.app).get('/api/tickets/active').set('Cookie', ta.cookie)).status).toBe(403);
    expect((await request(inactive.app).get('/api/tickets/active').set('Cookie', inactive.cookie)).status).toBe(401);
    expect(listActive).not.toHaveBeenCalled();
  });

  test('active ticket storage failures return a safe retry response', async () => {
    const { app, cookie } = createRouter({ store: { create: jest.fn(), listActive: jest.fn().mockRejectedValue(new Error('private storage detail')) } });
    const response = await request(app).get('/api/tickets/active').set('Cookie', cookie);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: 'Ticket service is temporarily unavailable. Please try again.' });
    expect(JSON.stringify(response.body)).not.toContain('private storage detail');
  });

  test('detail read hides another Student’s ticket as missing and uses no-store', async () => {
    const store = { create: jest.fn(), getOwned: jest.fn().mockResolvedValue(null) };
    const { app, cookie } = createRouter({ store });
    const response = await request(app).get('/api/tickets/foreign-ticket').set('Cookie', cookie);
    expect(response.status).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(/foreign-ticket|student-b/i);
  });

  test('detail read returns complete owned details and a trusted, plain-text reply thread', async () => {
    const ticket = {
      ticketId: 'ticket-1', studentId: 'student-a', title: '<script>literal</script>', language: 'TypeScript',
      conceptTags: ['loops'], files: [{ filename: 'main.ts', content: 'console.log(1)' }], repoUrl: null,
      repoFilePaths: [], errorOutput: 'error', expectedBehaviour: 'expected', actualBehaviour: 'actual',
      attempted: 'tried', status: 'OPEN', claimedByTaId: null, fixNote: null,
      createdAt: 'created', updatedAt: 'updated', resolvedAt: null,
    };
    const store = { create: jest.fn(), getOwned: jest.fn().mockResolvedValue({ ticket, replies: [
      { replyId: 'reply-1', authorUserId: 'student-a', message: '<b>text</b>', createdAt: 'time-1' },
      { replyId: 'reply-2', authorUserId: 'ta-a', message: 'Answer', createdAt: 'time-2' },
    ] }) };
    const { app, cookie } = createRouter({ account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE', name: 'Trusted Name' }, store });
    const response = await request(app).get('/api/tickets/ticket-1').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.ticket).toMatchObject({ ticketId: 'ticket-1', title: '<script>literal</script>', expectedBehaviour: 'expected', files: ticket.files });
    expect(response.body.replies).toEqual([
      { replyId: 'reply-1', author: { name: 'Trusted Name', role: 'STUDENT' }, message: '<b>text</b>', createdAt: 'time-1' },
      { replyId: 'reply-2', author: { name: 'TA', role: 'TA' }, message: 'Answer', createdAt: 'time-2' },
    ]);
    expect(JSON.stringify(response.body)).not.toContain('authorUserId');
  });

  test('missing owner author uses the deleted-account Student label', async () => {
    const ticket = { ticketId: 'ticket-1' };
    const store = { create: jest.fn(), getOwned: jest.fn().mockResolvedValue({ ticket, replies: [
      { replyId: 'reply-1', authorUserId: 'student-a', message: 'Older reply', createdAt: 'time' },
    ] }) };
    const account = { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' };
    let ownerLookups = 0;
    const repository = { async getUserById(id) {
      if (id !== 'student-a') return null;
      ownerLookups += 1;
      return ownerLookups <= 2 ? account : null;
    } };
    const { app, cookie } = createRouter({ store, repository });
    const response = await request(app).get('/api/tickets/ticket-1').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.replies[0].author).toEqual({ name: '[deleted account]', role: 'STUDENT' });
  });

  test('returns a cursor only for another page and bounds author lookup concurrency', async () => {
    let active = 0;
    let maximum = 0;
    const repository = {
      async getUserById(id) {
        if (id === 'student-a') return { userId: id, accountType: 'STUDENT', accountStatus: 'ACTIVE' };
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return null;
      },
    };
    const replies = Array.from({ length: 50 }, (_, i) => ({ replyId: `reply-${i}`, authorUserId: `other-${i}`, message: 'reply', createdAt: 'time' }));
    const store = { create: jest.fn(), getOwned: jest.fn().mockResolvedValue({ ticket: { ticketId: 'ticket-1' }, replies,
      hasMore: true, pageCursor: { createdAt: require('@google-cloud/firestore').Timestamp.fromMillis(1234), replyId: 'reply-49' } }) };
    const { app, cookie } = createRouter({ store, repository });
    const response = await request(app).get('/api/tickets/ticket-1').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(50);
    expect(response.body.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(maximum).toBeLessThanOrEqual(5);
    store.getOwned.mockResolvedValue({ ticket: { ticketId: 'ticket-1' }, replies: [], hasMore: false });
    const lastPage = await request(app).get('/api/tickets/ticket-1').set('Cookie', cookie);
    expect(lastPage.body).not.toHaveProperty('nextCursor');
  });

  test('detail read denies visitors and TAs before ticket lookup', async () => {
    const getOwned = jest.fn().mockResolvedValue(null);
    const visitor = await request(createRouter({ store: { create: jest.fn(), getOwned } }).app).get('/api/tickets/ticket-1');
    const ta = createRouter({ account: { userId: 'ta-a', accountType: 'TA', accountStatus: 'ACTIVE' }, store: { create: jest.fn(), getOwned } });
    const deniedTa = await request(ta.app).get('/api/tickets/ticket-1').set('Cookie', ta.cookie);
    expect(visitor.status).toBe(401);
    expect(deniedTa.status).toBe(403);
    expect(getOwned).not.toHaveBeenCalled();
  });

  test('detail storage failures return a safe retry response', async () => {
    const { app, cookie } = createRouter({ store: { create: jest.fn(), getOwned: jest.fn().mockRejectedValue(new Error('private storage detail')) } });
    const response = await request(app).get('/api/tickets/ticket-1').set('Cookie', cookie);
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain('private storage detail');
  });

  test('reply requires CSRF and accepts only a bounded message field', async () => {
    const reply = jest.fn().mockResolvedValue({ replyId: 'reply-1' });
    const store = { create: jest.fn(), reply };
    const { app, cookie, csrf } = createRouter({ store });
    const missingCsrf = await request(app).post('/api/tickets/ticket-1/replies').set('Cookie', cookie).send({ message: 'Hello' });
    expect(missingCsrf.status).toBe(403);
    expect(reply).not.toHaveBeenCalled();
    const forged = await request(app).post('/api/tickets/ticket-1/replies').set('Cookie', cookie)
      .set('X-CSRF-Token', csrf).send({ message: 'Hello', authorUserId: 'attacker' });
    expect(forged.status).toBe(400);
    expect(reply).not.toHaveBeenCalled();
  });

  test('close requires CSRF and returns a conflict for a terminal-state ticket', async () => {
    const close = jest.fn().mockRejectedValue(Object.assign(new Error('terminal'), { code: 'CONFLICT' }));
    const { app, cookie, csrf } = createRouter({ store: { create: jest.fn(), close } });
    const noCsrf = await request(app).post('/api/tickets/ticket-1/close').set('Cookie', cookie).send({});
    expect(noCsrf.status).toBe(403);
    const conflict = await request(app).post('/api/tickets/ticket-1/close').set('Cookie', cookie)
      .set('X-CSRF-Token', csrf).send({});
    expect(conflict.status).toBe(409);
  });
});
