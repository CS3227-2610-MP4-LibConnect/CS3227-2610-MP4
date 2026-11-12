const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const express = require('express');
const request = require('supertest');
const { Timestamp } = require('@google-cloud/firestore');
const { createTicketsRouter } = require('../server/tickets/route');
const { sealFaqToken } = require('../server/tickets/faq-token');

const token = 'synthetic-bug-faq-session-token-12345678901234567890';
const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const makeFaqRef = (system, ticketId = 'raw-ticket-id') => sealFaqToken({ v: 1, ticketId }, {
  idHash: system.idHash, studentId: 'student-a', purpose: 'faqRef', binding: {},
});
const makeReplyCursor = (system, faqRef, ticketId, replyId, createdAt = Timestamp.fromMillis(1_800_000_000_001)) => sealFaqToken({
  v: 1, ticketId, replyId, createdAt: createdAt instanceof Timestamp
    ? { seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds } : createdAt,
}, { idHash: system.idHash, studentId: 'student-a', purpose: 'replyCursor', binding: { faqRef } });

function fixture({ sessionToken = token, account = { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' }, relatedAccounts = [], searchFaq = jest.fn().mockResolvedValue({ tickets: [] }), getFaqDetail = jest.fn().mockResolvedValue(null) } = {}) {
  const idHash = sha256(sessionToken);
  const sessions = new Map([[idHash, { userId: account.userId, accountTypeAtIssue: account.accountType }]]);
  const accounts = new Map([[account.userId, account], ...relatedAccounts.map((value) => [value.userId, value])]);
  const repository = { getUserById: jest.fn(async (id) => accounts.get(id) || null) };
  const authStore = {
    async getSession(hash) { return sessions.get(hash) || null; },
    async touchSession() { return true; }, async deleteSession() {},
  };
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ repository, authStore, store: { create: jest.fn(), searchFaq, getFaqDetail } }));
  return { app, repository, searchFaq, getFaqDetail, sessions, idHash, cookie: `__Host-codeclinic_session=${sessionToken}` };
}

const faq = (system, query = 'loop', field = 'title') => request(system.app)
  .get('/api/tickets/faq').query({ q: query, field }).set('Cookie', system.cookie);

describe('GET /api/tickets/faq contract (T02)', () => {
  test('requires q and field and returns a no-store title/tag-only response', async () => {
    const searchFaq = jest.fn().mockResolvedValue({ tickets: [{ title: '<b>Loop</b>', conceptTags: ['arrays'], faqRef: 'opaque-ref-7' }] });
    const system = fixture({ searchFaq });
    const response = await faq(system, ' loop ', 'title').set('X-Session-Id-Hash', 'client-forged-id-hash');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.tickets).toEqual([{ title: '<b>Loop</b>', conceptTags: ['arrays'], faqRef: 'opaque-ref-7' }]);
    expect(response.body.tickets[0].faqRef.length).toBeGreaterThan(0);
    expect(response.body.tickets[0].faqRef.length).toBeLessThanOrEqual(512);
    expect(searchFaq).toHaveBeenCalledWith(expect.objectContaining({ idHash: system.idHash, studentId: 'student-a', query: 'loop', field: 'title' }));
    expect(JSON.stringify(response.body)).not.toMatch(/ticketId|studentId|owner|author|errorOutput|fixNote|repl(y|ies)/i);
  });

  test.each([
    ['/api/tickets/faq', 400],
    ['/api/tickets/faq?q=loop', 400],
    ['/api/tickets/faq?field=title', 400],
    ['/api/tickets/faq?q=%20%20&field=title', 400],
    ['/api/tickets/faq?q=loop&field=body', 400],
    ['/api/tickets/faq?q=loop&field=title&status=OPEN', 400],
    ['/api/tickets/faq?q=loop&q=other&field=title', 400],
    ['/api/tickets/faq?q=loop&field=title&field=tags', 400],
    [`/api/tickets/faq?q=${'x'.repeat(101)}&field=title`, 400],
    [`/api/tickets/faq?q=loop&field=title&cursor=${'x'.repeat(4096)}`, 400],
  ])('rejects malformed/unsupported query %s before ticket reads', async (path, status) => {
    const system = fixture();
    const response = await request(system.app).get(path).set('Cookie', system.cookie);
    expect(response.status).toBe(status);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.searchFaq).not.toHaveBeenCalled();
  });

  test('counts Unicode code points for the 100-character query limit', async () => {
    const system = fixture();
    const oneHundred = '😀'.repeat(100);
    const response = await faq(system, oneHundred);
    expect(response.status).toBe(200);
    expect(system.searchFaq).toHaveBeenCalledTimes(1);
    const tooLong = await faq(system, `${oneHundred}😀`);
    expect(tooLong.status).toBe(400);
    expect(system.searchFaq).toHaveBeenCalledTimes(1);
  });

  test('denies visitor, TA, inactive Student, and password-change-required Student before store access', async () => {
    const cases = [
      { account: { userId: 'ta-a', accountType: 'TA', accountStatus: 'ACTIVE' }, expected: 403 },
      { account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'INACTIVE' }, expected: 401 },
      { account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true }, expected: 403 },
    ];
    const visitor = fixture();
    expect((await request(visitor.app).get('/api/tickets/faq?q=loop&field=title')).status).toBe(401);
    expect(visitor.searchFaq).not.toHaveBeenCalled();
    for (const scenario of cases) {
      const system = fixture(scenario);
      expect((await faq(system)).status).toBe(scenario.expected);
      expect(system.searchFaq).not.toHaveBeenCalled();
    }
  });

  test('rejects invalid and cross-search cursors and ignores forged identity or status fields', async () => {
    const searchFaq = jest.fn().mockResolvedValue({ tickets: [{ title: 'Loop', conceptTags: [], faqRef: 'opaque-ref-7' }], nextCursor: 'opaque-next-page' });
    const system = fixture({ searchFaq });
    const first = await faq(system);
    expect(first.status).toBe(200);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const crossSearch = await request(system.app).get('/api/tickets/faq').query({ q: 'other', field: 'title', cursor: first.body.nextCursor }).set('Cookie', system.cookie);
    expect(crossSearch.status).toBe(400);
    const invalid = await request(system.app).get('/api/tickets/faq').query({ q: 'loop', field: 'title', cursor: 'invalid-cursor' }).set('Cookie', system.cookie);
    expect(invalid.status).toBe(400);
    const forged = await request(system.app).get('/api/tickets/faq').query({ q: 'loop', field: 'title', status: 'OPEN', role: 'TA', ownerId: 'other-student' }).set('Cookie', system.cookie);
    expect(forged.status).toBe(400);
    expect(searchFaq).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['GeoPoint', { __faqCursorValueType: 'geoPoint', latitude: 1.25, longitude: -2.5 }],
    ['ordinary map', { __faqCursorValueType: 'map', value: [['seconds', 42], ['nanoseconds', 17]] }],
  ])('accepts a bound typed %s search cursor for HTTP continuation', async (_type, createdAt) => {
    const system = fixture();
    const nextCursor = await sealFaqToken({ v: 1, ticketId: 'ticket-99', createdAt }, {
      idHash: system.idHash, studentId: 'student-a', purpose: 'searchCursor',
      binding: { query: 'loop', field: 'title' },
    });
    system.searchFaq
      .mockResolvedValueOnce({ tickets: [], nextCursor })
      .mockResolvedValueOnce({ tickets: [] });

    const first = await faq(system);
    expect(first.status).toBe(200);
    expect(first.body.nextCursor).toBe(nextCursor);
    const second = await faq(system).query({ cursor: first.body.nextCursor });

    expect(second.status).toBe(200);
    expect(second.headers['cache-control']).toBe('no-store');
    expect(system.searchFaq).toHaveBeenCalledTimes(2);
    expect(system.searchFaq).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: nextCursor }));
  });

  test('rejects malformed tagged search and reply boundaries before store reads', async () => {
    const system = fixture();
    const malformedSearchCursor = await sealFaqToken({
      v: 1, ticketId: 'ticket-99',
      createdAt: { __faqCursorValueType: 'geoPoint', latitude: 100, longitude: 0 },
    }, {
      idHash: system.idHash, studentId: 'student-a', purpose: 'searchCursor',
      binding: { query: 'loop', field: 'title' },
    });
    const searchResponse = await faq(system).query({ cursor: malformedSearchCursor });
    expect(searchResponse.status).toBe(400);
    expect(system.searchFaq).not.toHaveBeenCalled();

    const faqRef = await makeFaqRef(system, 'ticket-99');
    const malformedReplyCursor = await makeReplyCursor(system, faqRef, 'ticket-99', 'reply-1', {
      __faqCursorValueType: 'map', value: [['seconds']],
    });
    const detailResponse = await request(system.app).get(`/api/tickets/faq/${faqRef}`)
      .query({ cursor: malformedReplyCursor }).set('Cookie', system.cookie);
    expect(detailResponse.status).toBe(400);
    expect(detailResponse.headers['cache-control']).toBe('no-store');
    expect(system.getFaqDetail).not.toHaveBeenCalled();
  });

  test('returns a generic no-store 503 when ticket storage fails', async () => {
    const system = fixture({ searchFaq: jest.fn().mockRejectedValue(new Error('synthetic private storage detail')) });
    const response = await faq(system);
    expect(response.status).toBe(503);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('synthetic private storage detail');
  });

  test('returns the exact read-only detail projection with trusted speaker labels and literal message content', async () => {
    const getFaqDetail = jest.fn();
    const system = fixture({ getFaqDetail, relatedAccounts: [
      { userId: 'owner-x', accountType: 'STUDENT', accountStatus: 'ACTIVE', name: 'Hidden Student Account Name' },
      { userId: 'ta-x', accountType: 'TA', accountStatus: 'ACTIVE', name: 'Hidden TA Account Name' },
    ] });
    const faqRef = await makeFaqRef(system, 'raw-ticket-id');
    const nextCursor = await makeReplyCursor(system, faqRef, 'raw-ticket-id', 'raw-reply-2', Timestamp.fromMillis(1_800_000_000_002));
    getFaqDetail.mockResolvedValue({
      ticket: { ticketId: 'raw-ticket-id', studentId: 'owner-x', claimedByTaId: 'ta-x', status: 'RESOLVED',
        title: '<b>Question</b>', conceptTags: ['<i>loops</i>'], fixNote: '<script>fix</script>', errorOutput: 'private' },
      replies: [
        { replyId: 'raw-reply-1', ticketId: 'raw-ticket-id', authorUserId: 'owner-x', message: 'Sam Student says <img src=x>', createdAt: 'time-1' },
        { replyId: 'raw-reply-2', ticketId: 'raw-ticket-id', authorUserId: 'ta-x', message: 'Alice TA replied <b>literally</b>', createdAt: 'time-2' },
        { replyId: 'foreign-reply', ticketId: 'another-ticket', authorUserId: 'ta-x', message: 'must not be included', createdAt: 'time-3' },
      ], nextCursor,
    });
    const response = await request(system.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', system.cookie);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Object.keys(response.body).sort()).toEqual(['conceptTags', 'fixNote', 'nextCursor', 'replies', 'title']);
    expect(response.body).toEqual({
      title: '<b>Question</b>', conceptTags: ['<i>loops</i>'], fixNote: '<script>fix</script>',
      replies: [
        { speaker: 'Student', message: 'Sam Student says <img src=x>', createdAt: 'time-1' },
        { speaker: 'TA', message: 'Alice TA replied <b>literally</b>', createdAt: 'time-2' },
      ], nextCursor: expect.any(String),
    });
    expect(getFaqDetail).toHaveBeenCalledWith('student-a', faqRef, { cursor: undefined, idHash: system.idHash });
    expect(JSON.stringify(response.body)).not.toMatch(/authorUserId|authorName|replyId|ticketId|ownerId|studentId|Hidden .* Account Name|errorOutput/);
    expect(JSON.stringify(response.body)).not.toContain('must not be included');
  });

  test('validates reference and reply cursor before a ticket read and rejects cursor reuse across references', async () => {
    const getFaqDetail = jest.fn();
    const system = fixture({ getFaqDetail });
    const faqRefOne = await makeFaqRef(system, 'ticket-one');
    const faqRefTwo = await makeFaqRef(system, 'ticket-two');
    const nextCursor = await makeReplyCursor(system, faqRefOne, 'ticket-one', 'r1');
    getFaqDetail.mockResolvedValue({ ticket: { ticketId: 'ticket-one', status: 'RESOLVED', studentId: 'student-a', claimedByTaId: 'ta-a', title: 'one', conceptTags: [], fixNote: 'done' }, replies: [], nextCursor });
    const malformed = await request(system.app).get('/api/tickets/faq/not%2Fvalid').set('Cookie', system.cookie);
    expect(malformed.status).toBe(404);
    expect(getFaqDetail).not.toHaveBeenCalled();
    const badCursor = await request(system.app).get(`/api/tickets/faq/${faqRefOne}`).query({ cursor: 'invalid-cursor' }).set('Cookie', system.cookie);
    expect(badCursor.status).toBe(400);
    const longCursor = await request(system.app).get(`/api/tickets/faq/${faqRefOne}`).query({ cursor: 'x'.repeat(4096) }).set('Cookie', system.cookie);
    expect(longCursor.status).toBe(400);
    expect(getFaqDetail).not.toHaveBeenCalled();

    const first = await request(system.app).get(`/api/tickets/faq/${faqRefOne}`).set('Cookie', system.cookie);
    expect(first.status).toBe(200);
    const second = await request(system.app).get(`/api/tickets/faq/${faqRefTwo}`).query({ cursor: first.body.nextCursor }).set('Cookie', system.cookie);
    expect(second.status).toBe(400);
    expect(getFaqDetail).toHaveBeenCalledTimes(1);
  });

  test.each([
    { account: { userId: 'ta-a', accountType: 'TA', accountStatus: 'ACTIVE' }, expected: 403 },
    { account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'INACTIVE' }, expected: 401 },
    { account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true }, expected: 403 },
  ])('denies protected detail for ineligible account %#', async (scenario) => {
    const getFaqDetail = jest.fn();
    const system = fixture({ ...scenario, getFaqDetail });
    const response = await request(system.app).get('/api/tickets/faq/opaque-ref-7').set('Cookie', system.cookie);
    expect(response.status).toBe(scenario.expected);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getFaqDetail).not.toHaveBeenCalled();
  });

  test('requires a session for protected detail and bounds returned reply pages', async () => {
    const fiftyReplies = Array.from({ length: 50 }, (_, index) => ({
      replyId: `reply-${index}`, ticketId: 'raw-ticket', authorUserId: 'student-a',
      message: `Synthetic message ${index}`, createdAt: Timestamp.fromMillis(1_800_000_000_000 + index),
    }));
    const getFaqDetail = jest.fn();
    const system = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(system, 'raw-ticket');
    const nextCursor = await makeReplyCursor(system, faqRef, 'raw-ticket', 'reply-49', fiftyReplies[49].createdAt);
    getFaqDetail.mockResolvedValue({
      ticket: { ticketId: 'raw-ticket', status: 'RESOLVED', studentId: 'student-a', claimedByTaId: 'ta-a', title: 'Question', conceptTags: [], fixNote: 'Fixed' },
      replies: fiftyReplies, nextCursor,
    });
    const visitor = await request(system.app).get(`/api/tickets/faq/${faqRef}`);
    expect(visitor.status).toBe(401);
    expect(getFaqDetail).not.toHaveBeenCalled();
    const response = await request(system.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', system.cookie);
    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(50);
    expect(response.body.nextCursor).toEqual(expect.any(String));
  });

  test('continues a reply page with an opaque cursor bound to the same FAQ reference', async () => {
    const pageReplies = Array.from({ length: 50 }, (_, index) => ({
      replyId: `reply-${index}`, ticketId: 'raw-ticket', authorUserId: 'student-a',
      message: `Synthetic message ${index}`, createdAt: Timestamp.fromMillis(1_800_000_000_000 + index),
    }));
    const boundary = Timestamp.fromMillis(1_800_000_000_049);
    const getFaqDetail = jest.fn();
    const system = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(system, 'raw-ticket');
    const nextCursor = await makeReplyCursor(system, faqRef, 'raw-ticket', 'reply-49', boundary);
    getFaqDetail
      .mockResolvedValueOnce({ ticket: { ticketId: 'raw-ticket', status: 'RESOLVED', studentId: 'student-a', claimedByTaId: 'ta-a', title: 'Question', conceptTags: [], fixNote: 'Fixed' }, replies: pageReplies, nextCursor })
      .mockResolvedValueOnce({ ticket: { ticketId: 'raw-ticket', status: 'RESOLVED', studentId: 'student-a', claimedByTaId: 'ta-a', title: 'Question', conceptTags: [], fixNote: 'Fixed' }, replies: [] });
    const first = await request(system.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', system.cookie);
    expect(first.status).toBe(200);
    expect(first.body.replies).toHaveLength(50);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await request(system.app).get(`/api/tickets/faq/${faqRef}`).query({ cursor: first.body.nextCursor }).set('Cookie', system.cookie);
    expect(second.status).toBe(200);
    expect(second.body).not.toHaveProperty('nextCursor');
    expect(getFaqDetail).toHaveBeenLastCalledWith('student-a', faqRef, { cursor: first.body.nextCursor, idHash: system.idHash });
  });

  test('accepts a bound non-Timestamp reply cursor and passes it through to the store', async () => {
    const getFaqDetail = jest.fn().mockResolvedValue({
      ticket: { ticketId: 'raw-ticket', status: 'RESOLVED', studentId: 'student-a', claimedByTaId: 'ta-a', title: 'Question', conceptTags: [], fixNote: 'Fixed' },
      replies: [],
    });
    const system = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(system, 'raw-ticket');
    const cursor = await makeReplyCursor(system, faqRef, 'raw-ticket', 'reply-49', {
      __faqCursorValueType: 'geoPoint', latitude: 3.5, longitude: 4.5,
    });

    const response = await request(system.app).get(`/api/tickets/faq/${faqRef}`)
      .query({ cursor }).set('Cookie', system.cookie);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getFaqDetail).toHaveBeenCalledWith('student-a', faqRef, { cursor, idHash: system.idHash });
  });

  test('returns a generic no-store error for expired or no-longer-RESOLVED references', async () => {
    const system = fixture({ getFaqDetail: jest.fn().mockResolvedValue(null) });
    const response = await request(system.app).get('/api/tickets/faq/expired-reference').set('Cookie', system.cookie);
    expect([400, 404]).toContain(response.status);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(/ticketId|studentId|private|not resolved/i);
  });

  test('never returns a detail response for a ticket whose stored status is not RESOLVED', async () => {
    const getFaqDetail = jest.fn().mockResolvedValue({
      ticket: { ticketId: 'closed-ticket', status: 'CLOSED', title: 'Closed only', conceptTags: [], fixNote: null }, replies: [],
    });
    const system = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(system, 'closed-ticket');
    const response = await request(system.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', system.cookie);
    expect(response.status).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('Closed only');
  });

  test('binds an opaque FAQ reference to the exact session, including another session for the same Student', async () => {
    const getFaqDetail = jest.fn(async (studentId, faqRef, { idHash }) => studentId === 'student-a' && idHash === sha256(token)
      ? { ticket: { ticketId: 'owner-ticket', status: 'RESOLVED', studentId: 'owner-x', title: 'Question', conceptTags: [], fixNote: 'Fixed' }, replies: [] }
      : null);
    const owner = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(owner, 'owner-ticket');
    const otherSession = fixture({
      sessionToken: 'second-synthetic-session-token-12345678901234567890',
      account: { userId: 'student-a', accountType: 'STUDENT', accountStatus: 'ACTIVE' },
      getFaqDetail,
    });
    expect((await request(owner.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', owner.cookie)).status).toBe(200);
    const denied = await request(otherSession.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', otherSession.cookie);
    expect(denied.status).toBe(404);
    expect(denied.headers['cache-control']).toBe('no-store');
    expect(owner.idHash).not.toBe(otherSession.idHash);
    expect(getFaqDetail).toHaveBeenCalledTimes(1);
  });

  test('uses trusted idHash to redeem the same token across router instances and rejects it after logout', async () => {
    const sessionToken = 'same-session-token-for-two-server-instances-123456';
    const searchFaq = jest.fn();
    const firstInstance = fixture({ sessionToken, searchFaq });
    const faqRef = await makeFaqRef(firstInstance, 'shared-ticket');
    searchFaq.mockResolvedValue({ tickets: [{ title: 'Question', conceptTags: [], faqRef }] });
    const search = await faq(firstInstance).set('X-Session-Id-Hash', 'forged-session-hash');
    expect(search.status).toBe(200);

    const getFaqDetail = jest.fn(async (studentId, receivedFaqRef, { idHash }) => (
      studentId === 'student-a' && receivedFaqRef === faqRef && idHash === firstInstance.idHash
        ? { ticket: { ticketId: 'shared-ticket', status: 'RESOLVED', studentId: 'owner-x', title: 'Question', conceptTags: [], fixNote: 'Fixed' }, replies: [] }
        : null
    ));
    const secondInstance = fixture({ sessionToken, getFaqDetail });
    expect(secondInstance.idHash).toBe(firstInstance.idHash);
    const detail = await request(secondInstance.app).get(`/api/tickets/faq/${search.body.tickets[0].faqRef}`).set('Cookie', secondInstance.cookie);
    expect(detail.status).toBe(200);
    expect(getFaqDetail).toHaveBeenCalledWith('student-a', faqRef, { cursor: undefined, idHash: secondInstance.idHash });

    secondInstance.sessions.delete(secondInstance.idHash);
    const afterLogout = await request(secondInstance.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', secondInstance.cookie);
    expect(afterLogout.status).toBe(401);
    expect(getFaqDetail).toHaveBeenCalledTimes(1);
  });

  test('returns a generic no-store 503 when detail storage fails', async () => {
    const getFaqDetail = jest.fn().mockRejectedValue(new Error('synthetic private detail storage failure'));
    const system = fixture({ getFaqDetail });
    const faqRef = await makeFaqRef(system, 'private-ticket');
    const response = await request(system.app).get(`/api/tickets/faq/${faqRef}`).set('Cookie', system.cookie);
    expect(response.status).toBe(503);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('synthetic private detail storage failure');
  });
});
