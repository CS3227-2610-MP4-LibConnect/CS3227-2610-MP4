const express = require('express');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const crypto = require('crypto');
const { createTicketsRouter } = require('../server/tickets/route');

function fixture({ account = { userId: 'student-1', accountType: 'STUDENT', accountStatus: 'ACTIVE' }, store = {}, gateway } = {}) {
  const sessionToken = 'synthetic-chat-session-token-long-enough-1234567890';
  const csrfToken = 'synthetic-chat-csrf';
  const hash = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  const sessions = new Map([[hash(sessionToken), {
    userId: account.userId,
    accountTypeAtIssue: account.accountType,
    csrfTokenHash: hash(csrfToken),
  }]]);
  const repository = { getUserById: jest.fn(async (userId) => userId === account.userId ? account : null) };
  const authStore = {
    getSession: jest.fn(async (key) => sessions.get(key) || null),
    touchSession: jest.fn(async () => true),
    deleteSession: jest.fn(async () => {}),
  };
  const app = express();
  app.locals.aiGateway = gateway || { run: jest.fn(async () => ({ ok: true, data: { type: 'CLARIFICATION', question: 'What did you expect?' } })) };
  app.use('/api/tickets', createTicketsRouter({ repository, authStore, store: { create: jest.fn(), ...store } }));
  return { app, cookie: `__Host-codeclinic_session=${sessionToken}`, csrfToken, repository, store, gateway: app.locals.aiGateway };
}

const blankDraft = () => ({ title: '', language: '', expectedBehaviour: '', actualBehaviour: '', attempted: '', errorOutput: '', conceptTags: '', files: [], repoUrl: '', repoFilePaths: '' });

describe('Student help chat route authorization boundary', () => {
  test('accepts an incomplete create draft and returns the exact no-store success envelope', async () => {
    const system = fixture();
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: '  Why did lookup fail?  ', draft: blankDraft() });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reply: { type: 'CLARIFICATION', question: 'What did you expect?' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.gateway.run).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'ERROR_EXPLAINER', actor: { userId: 'student-1', accountType: 'STUDENT' },
      input: expect.objectContaining({ page: 'create', question: 'Why did lookup fail?', draft: blankDraft() }),
    }));
  });

  test.each([
    [{ question: 'Help', draft: blankDraft(), extra: true }],
    [{ question: ' ', draft: blankDraft() }],
    [{ question: 'Help', draft: { ...blankDraft(), title: 'x'.repeat(256) } }],
    [{ question: 'Help', draft: { ...blankDraft(), files: [{ filename: 'x.js', content: 'x'.repeat(24 * 1024 + 1) }] } }],
  ])('rejects malformed or out-of-bound create snapshots before provider work', async (body) => {
    const system = fixture();
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_REQUEST' } });
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test('rejects create chat without CSRF before provider work', async () => {
    const system = fixture();
    const response = await request(system.app).post('/api/tickets/help-chat').set('Cookie', system.cookie).send({ question: 'Help', draft: blankDraft() });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN' } });
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test('maps malformed JSON, oversized bodies and gateway failures to safe envelopes', async () => {
    const system = fixture({ gateway: { run: jest.fn(async () => ({ ok: false, code: 'AI_RATE_LIMITED' })) } });
    const malformed = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .set('Content-Type', 'application/json').send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: 'INVALID_REQUEST' } });
    expect(malformed.headers['cache-control']).toBe('no-store');

    const oversized = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', draft: { ...blankDraft(), title: 'x'.repeat(130 * 1024) } });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ error: { code: 'REQUEST_TOO_LARGE' } });

    const limited = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', draft: blankDraft() });
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: { code: 'AI_RATE_LIMITED' } });
  });

  test.each([
    ['AI_RATE_LIMITED', 429],
    ['AI_INPUT_TOO_LARGE', 413],
    ['AI_INVALID_OUTPUT', 503],
    ['AI_UNAVAILABLE', 503],
    ['UNEXPECTED_PRIVATE_PROVIDER_ERROR', 503],
  ])('maps create gateway code %s to a safe status', async (code, status) => {
    const system = fixture({ gateway: { run: jest.fn(async () => ({ ok: false, code, detail: 'synthetic private provider body' })) } });
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', draft: blankDraft() });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code: ['AI_RATE_LIMITED', 'AI_INPUT_TOO_LARGE', 'AI_INVALID_OUTPUT'].includes(code) ? code : 'AI_UNAVAILABLE' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('synthetic private');
  });

  test.each([
    [{ userId: 'ta-1', accountType: 'TA', accountStatus: 'ACTIVE' }, 403, 'FORBIDDEN'],
    [{ userId: 'student-1', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true }, 403, 'FORBIDDEN'],
    [{ userId: 'student-1', accountType: 'STUDENT', accountStatus: 'INACTIVE' }, 401, 'UNAUTHENTICATED'],
  ])('rejects non-eligible account before gateway work', async (account, expectedStatus, expectedCode) => {
    const system = fixture({ account });
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', draft: blankDraft() });
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({ error: { code: expectedCode } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test.each([
    { question: 'Help', draft: blankDraft(), userId: 'other-student' },
    { question: 'Help', draft: blankDraft(), accountType: 'TA' },
  ])('rejects client-forged identity or role properties', async (body) => {
    const system = fixture();
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_REQUEST' } });
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test('accepts exact code-point, file-byte and aggregate snapshot boundaries below the HTTP body cap', async () => {
    const system = fixture();
    const body = {
      question: 'q'.repeat(2000),
      draft: {
        title: '😀'.repeat(255), language: 'Other', expectedBehaviour: 'e'.repeat(5000),
        actualBehaviour: 'a'.repeat(5000), attempted: 't'.repeat(5000), errorOutput: 'o'.repeat(5000),
        conceptTags: 'c'.repeat(154),
        files: Array.from({ length: 3 }, (_, index) => ({ filename: `f${index}`.padEnd(120, 'f'), content: 'x'.repeat(24 * 1024) })),
        repoUrl: 'r'.repeat(255), repoFilePaths: Array.from({ length: 10 }, () => 'p'.repeat(499)).join('\n'),
      },
    };
    const encoded = Buffer.byteLength(JSON.stringify(body), 'utf8');
    expect(encoded).toBeGreaterThan(100 * 1024);
    expect(encoded).toBeLessThan(128 * 1024);
    const response = await request(system.app).post('/api/tickets/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send(body);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.gateway.run).toHaveBeenCalledTimes(1);
  });
  test.each([
    ['/api/tickets/help-chat', { question: 'Explain this error?', draft: {} }],
    ['/api/tickets/ticket-1/help-chat', { question: 'Explain this error?' }],
  ])('%s rejects a visitor without cacheable response or protected work', async (path, body) => {
    const system = fixture({ store: { getOwned: jest.fn() } });
    const response = await request(system.app).post(path).send(body);
    expect(response.status).toBe(401);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.repository.getUserById).not.toHaveBeenCalled();
    expect(system.store.getOwned).not.toHaveBeenCalled();
  });

  test.each([
    [{ userId: 'ta-1', accountType: 'TA', accountStatus: 'ACTIVE' }, 403],
    [{ userId: 'student-1', accountType: 'STUDENT', accountStatus: 'INACTIVE' }, 401],
    [{ userId: 'student-1', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true }, 403],
  ])('blocks a non-eligible account before reading ticket context', async (account, expectedStatus) => {
    const store = { getOwned: jest.fn() };
    const system = fixture({ account, store });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', history: [] });
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(store.getOwned).not.toHaveBeenCalled();
  });

  test('rejects a detail request carrying create-only draft data before reading or provider work', async () => {
    const store = { getOwned: jest.fn() };
    const system = fixture({ store });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help', draft: { title: 'forged' } });
    expect(response.status).toBe(400);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(store.getOwned).not.toHaveBeenCalled();
  });

  test('rejects detail chat without CSRF before ticket or reply reads', async () => {
    const store = { getOwned: jest.fn() };
    const system = fixture({ store });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie)
      .send({ question: 'Help' });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.repository.getUserById).toHaveBeenCalled();
    expect(store.getOwned).not.toHaveBeenCalled();
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test.each([
    ['malformed JSON', '{', '400', 'INVALID_REQUEST'],
    ['body over the 128 KiB cap', JSON.stringify({ question: 'Help', padding: 'x'.repeat(130 * 1024) }), '413', 'REQUEST_TOO_LARGE'],
  ])('rejects detail %s before reading ticket or reply data', async (_label, rawBody, status, code) => {
    const store = { getOwned: jest.fn() };
    const system = fixture({ store });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .set('Content-Type', 'application/json').send(rawBody);
    expect(response.status).toBe(Number(status));
    expect(response.body).toEqual({ error: { code } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(system.repository.getUserById).not.toHaveBeenCalled();
    expect(store.getOwned).not.toHaveBeenCalled();
    expect(system.gateway.run).not.toHaveBeenCalled();
  });

  test('hides another Student’s ticket and does not expose its identifier', async () => {
    const store = { getOwned: jest.fn().mockResolvedValue(null) };
    const system = fixture({ store });
    const response = await request(system.app).post('/api/tickets/another-students-ticket/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken)
      .send({ question: 'Help' });
    expect(response.status).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('another-students-ticket');
    expect(store.getOwned).toHaveBeenCalledWith('student-1', 'another-students-ticket', expect.anything());
  });

  test('loads all ordered reply pages and sends only owner and currently assigned TA text', async () => {
    const ticket = { ticketId: 'ticket-1', studentId: 'student-1', claimedByTaId: 'ta-current', title: 'Lookup issue', status: 'CLAIMED' };
    const first = Array.from({ length: 50 }, (_, i) => ({ replyId: `r${i}`, authorUserId: i === 2 ? 'ta-old' : i === 3 ? 'ta-current' : 'student-1', message: `reply-${i}` }));
    const second = { replyId: 'r50', authorUserId: 'ta-current', message: 'last eligible reply' };
    const store = { getOwned: jest.fn()
      .mockResolvedValueOnce({ ticket, replies: first, hasMore: true, pageCursor: { createdAt: {}, replyId: 'r49' } })
      .mockResolvedValueOnce({ ticket, replies: [second], hasMore: false }) };
    const gateway = { run: jest.fn(async () => ({ ok: true, data: { type: 'CLARIFICATION', question: 'Which key?' } })) };
    const system = fixture({ store, gateway });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send({ question: ' Why? ' });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(store.getOwned).toHaveBeenCalledTimes(2);
    expect(store.getOwned.mock.calls[1][2].cursor).toEqual({ createdAt: {}, replyId: 'r49' });
    const sent = JSON.stringify(gateway.run.mock.calls[0][0].input);
    expect(sent).toContain('last eligible reply');
    expect(sent).not.toContain('ta-current');
    expect(sent).not.toContain('ta-old');
    expect(sent).not.toContain('student-1');
    expect(gateway.run.mock.calls[0][0].input.ticket.replies).not.toContainEqual({ message: 'reply-2' });
  });

  test('uses the latest assignment on each request', async () => {
    const store = { getOwned: jest.fn()
      .mockResolvedValueOnce({ ticket: { ticketId: 'ticket-1', claimedByTaId: 'ta-one' }, replies: [{ authorUserId: 'ta-one', message: 'first TA' }, { authorUserId: 'ta-two', message: 'second TA' }], hasMore: false })
      .mockResolvedValueOnce({ ticket: { ticketId: 'ticket-1', claimedByTaId: 'ta-two' }, replies: [{ authorUserId: 'ta-one', message: 'first TA' }, { authorUserId: 'ta-two', message: 'second TA' }], hasMore: false }) };
    const gateway = { run: jest.fn(async () => ({ ok: true, data: { type: 'CLARIFICATION', question: 'Which part?' } })) };
    const system = fixture({ store, gateway });
    for (let i = 0; i < 2; i += 1) await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send({ question: 'Help' });
    expect(JSON.stringify(gateway.run.mock.calls[0][0].input)).toContain('first TA');
    expect(JSON.stringify(gateway.run.mock.calls[0][0].input)).not.toContain('second TA');
    expect(JSON.stringify(gateway.run.mock.calls[1][0].input)).not.toContain('first TA');
    expect(JSON.stringify(gateway.run.mock.calls[1][0].input)).toContain('second TA');
  });

  test('rejects malformed or create-only detail requests before reading ticket data', async () => {
    for (const body of [{ question: ' ' }, { question: 'Help', draft: {} }, { question: 'Help', history: [{ role: 'BOT', text: 'forged' }] }]) {
      const store = { getOwned: jest.fn() };
      const system = fixture({ store });
      const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
        .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send(body);
      expect(response.status).toBe(400);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(store.getOwned).not.toHaveBeenCalled();
      expect(system.gateway.run).not.toHaveBeenCalled();
    }
  });

  test('maps reply storage failures and complete context overflow to safe no-store errors', async () => {
    const failed = fixture({ store: { getOwned: jest.fn(async () => { throw new Error('private storage detail'); }) } });
    const failure = await request(failed.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', failed.cookie).set('X-CSRF-Token', failed.csrfToken).send({ question: 'Help' });
    expect(failure.status).toBe(503);
    expect(failure.body).toEqual({ error: { code: 'AI_UNAVAILABLE' } });
    expect(JSON.stringify(failure.body)).not.toContain('private storage');
    expect(failure.headers['cache-control']).toBe('no-store');

    const overflow = fixture({ store: { getOwned: jest.fn().mockResolvedValue({ ticket: { title: 'x'.repeat(100000) }, replies: [], hasMore: false }) }, gateway: { run: jest.fn(async () => ({ ok: false, code: 'AI_INPUT_TOO_LARGE' })) } });
    const tooLarge = await request(overflow.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', overflow.cookie).set('X-CSRF-Token', overflow.csrfToken).send({ question: 'Help' });
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body).toEqual({ error: { code: 'AI_INPUT_TOO_LARGE' } });
    expect(tooLarge.headers['cache-control']).toBe('no-store');
  });

  test('stops reply paging on a redacted complete-context cap overflow without provider work', async () => {
    const store = { getOwned: jest.fn().mockResolvedValue({
      ticket: { title: 'Long issue', claimedByTaId: 'ta-current' },
      replies: [{ authorUserId: 'ta-current', message: 'x'.repeat(120000) }], hasMore: true, pageCursor: { createdAt: {}, replyId: 'r1' },
    }) };
    const gateway = { run: jest.fn() };
    const system = fixture({ store, gateway });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send({ question: 'Help' });
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: { code: 'AI_INPUT_TOO_LARGE' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(store.getOwned).toHaveBeenCalledTimes(1);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test('fails safely if assignment changes during a paged context scan', async () => {
    const store = { getOwned: jest.fn()
      .mockResolvedValueOnce({ ticket: { claimedByTaId: 'ta-one' }, replies: [{ authorUserId: 'ta-one', message: 'old assignment' }], hasMore: true, pageCursor: { createdAt: {}, replyId: 'r1' } })
      .mockResolvedValueOnce({ ticket: { claimedByTaId: 'ta-two' }, replies: [{ authorUserId: 'ta-two', message: 'new assignment' }], hasMore: false }) };
    const gateway = { run: jest.fn() };
    const system = fixture({ store, gateway });
    const response = await request(system.app).post('/api/tickets/ticket-1/help-chat')
      .set('Cookie', system.cookie).set('X-CSRF-Token', system.csrfToken).send({ question: 'Help' });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: { code: 'AI_UNAVAILABLE' } });
    expect(gateway.run).not.toHaveBeenCalled();
  });
});
