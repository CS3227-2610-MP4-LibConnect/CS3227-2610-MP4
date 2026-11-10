const express = require('express');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const { createTicketsRouter } = require('../server/tickets/route');
const { createFirestoreTicketStore } = require('../server/tickets/store');
const indexConfig = require('../firestore.indexes.json');
const { encodeListCursor, decodeListCursor } = require('../server/tickets/list-cursor');
const { Timestamp } = require('@google-cloud/firestore');

function createListApp({ store, account = { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' } }) {
  const crypto = require('crypto');
  const token = 'synthetic-session-token-for-my-tickets-list-contract';
  const csrf = 'synthetic-csrf-token';
  const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  const sessions = new Map([[sha256(token), { userId: account.userId, accountTypeAtIssue: account.accountType, csrfTokenHash: sha256(csrf) }]]);
  const authStore = { async getSession(hash) { return sessions.get(hash) || null; }, async touchSession() { return true; }, async deleteSession() {} };
  const repository = { async getUserById(id) { return id === account.userId ? account : null; } };
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ repository, authStore, store }));
  return { app, cookie: `__Host-codeclinic_session=${token}` };
}

function createTwoStudentListApp() {
  const crypto = require('crypto');
  const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  const accounts = new Map([
    ['student-a', { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' }],
    ['student-b', { userId: 'student-b', accountType: 'STUDENT', accountStatus: 'ACTIVE' }],
  ]);
  const sessions = new Map([
    [sha256('synthetic-student-a-session-token-for-isolation-test'), { userId: 'student-a', accountTypeAtIssue: 'STUDENT' }],
    [sha256('synthetic-student-b-session-token-for-isolation-test'), { userId: 'student-b', accountTypeAtIssue: 'STUDENT' }],
  ]);
  const seededTickets = [
    { ticketId: 'student-a-ticket', studentId: 'student-a', title: 'A private synthetic ticket', language: 'TypeScript', conceptTags: [], status: 'OPEN', updatedAt: '2026-11-10T00:00:00Z' },
    { ticketId: 'student-b-ticket', studentId: 'student-b', title: 'B private synthetic ticket', language: 'Python', conceptTags: ['loops'], status: 'OPEN', updatedAt: '2026-11-10T00:00:00Z' },
  ];
  const listPage = jest.fn(async (ownerId, view) => ({
    tickets: seededTickets.filter((ticket) => ticket.studentId === ownerId &&
      (view === 'open' ? ['OPEN', 'CLAIMED'] : ['CLOSED', 'RESOLVED']).includes(ticket.status))
      .map(({ studentId, ...summary }) => summary),
  }));
  const authStore = {
    async getSession(hash) { return sessions.get(hash) || null; },
    async touchSession() { return true; },
    async deleteSession() {},
  };
  const repository = { async getUserById(id) { return accounts.get(id) || null; } };
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ repository, authStore, store: { create: jest.fn(), listPage } }));
  return {
    app,
    cookies: {
      a: '__Host-codeclinic_session=synthetic-student-a-session-token-for-isolation-test',
      b: '__Host-codeclinic_session=synthetic-student-b-session-token-for-isolation-test',
    },
    listPage,
  };
}

describe('Student My Tickets list API contract', () => {
  test.each([
    ['open', ['OPEN', 'CLAIMED']],
    ['closed', ['CLOSED', 'RESOLVED']],
  ])('serves the %s view as safe, non-cacheable summaries', async (view, statuses) => {
    const tickets = statuses.map((status, index) => ({ ticketId: `ticket-${index}`, title: 'Literal <b>title</b>', language: 'TypeScript', conceptTags: [], status, updatedAt: '2026-11-10T00:00:00Z' }));
    const listPage = jest.fn().mockResolvedValue({ tickets });
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get(`/api/tickets?view=${view}`).set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(response.body).toEqual({ tickets });
    expect(listPage).toHaveBeenCalledWith('student-a', view, undefined);
    for (const item of response.body.tickets) {
      expect(Object.keys(item).sort()).toEqual(['conceptTags', 'language', 'status', 'ticketId', 'title', 'updatedAt']);
    }
  });

  test('defaults the view to Open and ignores a forged owner parameter', async () => {
    const listPage = jest.fn().mockResolvedValue({ tickets: [] });
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get('/api/tickets?studentId=student-b').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(listPage).toHaveBeenCalledWith('student-a', 'open', undefined);
  });

  test('isolates two authenticated Students despite forged owner parameters', async () => {
    const { app, cookies, listPage } = createTwoStudentListApp();
    const studentA = await request(app).get('/api/tickets?view=open&studentId=student-b').set('Cookie', cookies.a);
    const studentB = await request(app).get('/api/tickets?view=open&studentId=student-a').set('Cookie', cookies.b);

    expect(studentA.status).toBe(200);
    expect(studentA.body.tickets.map(({ ticketId }) => ticketId)).toEqual(['student-a-ticket']);
    expect(JSON.stringify(studentA.body)).not.toContain('student-b-ticket');
    expect(studentB.status).toBe(200);
    expect(studentB.body.tickets.map(({ ticketId }) => ticketId)).toEqual(['student-b-ticket']);
    expect(JSON.stringify(studentB.body)).not.toContain('student-a-ticket');
    expect(listPage.mock.calls).toEqual([
      ['student-a', 'open', undefined],
      ['student-b', 'open', undefined],
    ]);
  });

  test('denies a visitor without querying ticket storage', async () => {
    const listPage = jest.fn();
    const { app } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get('/api/tickets?view=open');
    expect(response.status).toBe(401);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(listPage).not.toHaveBeenCalled();
  });

  test.each(['view=other', 'view=open&view=closed', 'cursor=bad'])('rejects malformed list query (%s) before storage', async (query) => {
    const listPage = jest.fn();
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get(`/api/tickets?${query}`).set('Cookie', cookie);
    expect(response.status).toBe(400);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(listPage).not.toHaveBeenCalled();
  });

  test.each([
    [{ userId: 'ta-a', accountType: 'TA', accountStatus: 'ACTIVE' }, 403],
    [{ userId: 'student-a', accountType: 'STUDENT', accountStatus: 'INACTIVE' }, 401],
  ])('denies ineligible account %j before storage', async (account, expectedStatus) => {
    const listPage = jest.fn();
    const { app, cookie } = createListApp({ account, store: { create: jest.fn(), listPage } });
    const response = await request(app).get('/api/tickets?view=open').set('Cookie', cookie);
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(listPage).not.toHaveBeenCalled();
  });

  test('denies accounts requiring a password change without querying storage', async () => {
    const listPage = jest.fn();
    const { app, cookie } = createListApp({
      account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true },
      store: { create: jest.fn(), listPage },
    });
    const response = await request(app).get('/api/tickets?view=open').set('Cookie', cookie);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(listPage).not.toHaveBeenCalled();
  });

  test('returns a safe retry response when list storage fails', async () => {
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage: jest.fn().mockRejectedValue(new Error('private storage detail')) } });
    const response = await request(app).get('/api/tickets?view=closed').set('Cookie', cookie);
    expect(response.status).toBe(503);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(JSON.stringify(response.body)).not.toContain('private storage detail');
  });

  test('rejects a cursor replayed into the other view before querying storage', async () => {
    const nextCursor = encodeListCursor('open', { updatedAt: new Timestamp(100, 20), ticketId: 'ticket-a' });
    const listPage = jest.fn().mockResolvedValue({ tickets: [] });
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get(`/api/tickets?view=closed&cursor=${nextCursor}`).set('Cookie', cookie);
    expect(response.status).toBe(400);
    expect(response.headers['cache-control']).toMatch(/no-store/);
    expect(listPage).not.toHaveBeenCalled();
  });

  test('returns a view-bound opaque cursor when another page exists', async () => {
    const boundary = { updatedAt: new Timestamp(100, 20), ticketId: 'ticket-a' };
    const listPage = jest.fn().mockResolvedValue({ tickets: [], nextCursor: boundary });
    const { app, cookie } = createListApp({ store: { create: jest.fn(), listPage } });
    const response = await request(app).get('/api/tickets?view=open').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.tickets).toEqual([]);
    expect(decodeListCursor(response.body.nextCursor, 'open', Timestamp)).toEqual(boundary);
    expect(decodeListCursor(response.body.nextCursor, 'closed', Timestamp)).toBeNull();
  });
});

describe('Student My Tickets Firestore query contract', () => {
  test.each([
    ['open', ['OPEN', 'CLAIMED']],
    ['closed', ['CLOSED', 'RESOLVED']],
  ])('bounds the %s query to owner, statuses, order, cursor, and 21 documents', async (view, statuses) => {
    const operations = [];
    const docs = Array.from({ length: 21 }, (_, index) => ({ id: `ticket-${index}`, data: () => ({ ticketId: `ticket-${index}`, studentId: 'student-a', title: 'T', language: 'Java', conceptTags: [], status: statuses[0], updatedAt: 'same-time', files: ['private'] }) }));
    const query = {
      where(field, operator, value) { operations.push(['where', field, operator, value]); return this; },
      orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
      startAfter(...values) { operations.push(['startAfter', ...values]); return this; },
      limit(value) { operations.push(['limit', value]); return this; },
      async get() { operations.push(['get']); return { docs }; },
    };
    const store = createFirestoreTicketStore({ collection(name) { operations.push(['collection', name]); return query; } });
    const result = await store.listPage('student-a', view, { updatedAt: 'cursor-time', ticketId: 'cursor-id' });
    expect(operations).toContainEqual(['where', 'studentId', '==', 'student-a']);
    expect(operations).toContainEqual(['where', 'status', 'in', statuses]);
    expect(operations).toContainEqual(['orderBy', 'updatedAt', 'desc']);
    expect(operations).toContainEqual(['orderBy', 'ticketId', 'asc']);
    expect(operations).toContainEqual(['startAfter', 'cursor-time', 'cursor-id']);
    expect(operations).toContainEqual(['limit', 21]);
    expect(result.tickets).toHaveLength(20);
    expect(result.nextCursor).toBeTruthy();
    expect(result.nextCursor.ticketId).toBe('ticket-19');
    expect(result.tickets.every((ticket) => Object.keys(ticket).sort().join(',') === 'conceptTags,language,status,ticketId,title,updatedAt')).toBe(true);
    expect(operations.filter(([operation]) => operation === 'get')).toHaveLength(1);
    expect(operations.some(([operation, field]) => operation === 'collection' && field !== 'tickets')).toBe(false);
  });
});

describe('Student My Tickets Firestore index', () => {
  test('defines the exact owner/status/update-time/ticket-ID query index', () => {
    expect(indexConfig.indexes).toContainEqual({
      collectionGroup: 'tickets',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'studentId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'updatedAt', order: 'DESCENDING' },
        { fieldPath: 'ticketId', order: 'ASCENDING' },
      ],
    });
  });
});
