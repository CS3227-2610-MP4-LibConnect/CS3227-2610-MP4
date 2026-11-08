const { createNotify, notify, configureNotify, MAX_MESSAGE_LENGTH } = require('../server/notifications/notify');

function fakeFirestore({ failures = 0 } = {}) {
  const writes = [];
  let attempts = 0;
  const db = {
    collection(name) {
      return {
        doc(id) {
          return {
            async set(data) {
              attempts += 1;
              if (attempts <= failures) throw new Error('synthetic storage failure secret-ticket-title');
              writes.push({ collection: name, id, data });
            },
          };
        },
      };
    },
  };
  return { db, writes, get attempts() { return attempts; } };
}

function quietLogger() {
  return { warn: jest.fn() };
}

const valid = {
  recipientUserId: 'student-1',
  notificationType: 'TICKET_CLAIMED',
  ticketId: 'ticket-1',
  message: '  Your ticket was claimed.  ',
};

const fixedClock = () => Date.UTC(2026, 10, 8, 12, 0, 0);

test('a valid input writes one unread notification with the R1 shape', async () => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { now: fixedClock, newId: () => 'n-1', logger: quietLogger() });
  await expect(send(valid)).resolves.toEqual({ ok: true, notificationId: 'n-1' });
  expect(store.writes).toEqual([{
    collection: 'notifications',
    id: 'n-1',
    data: {
      notificationId: 'n-1',
      recipientUserId: 'student-1',
      notificationType: 'TICKET_CLAIMED',
      ticketId: 'ticket-1',
      message: 'Your ticket was claimed.',
      createdAt: new Date(fixedClock()),
      read: false,
    },
  }]);
});

test.each(['TICKET_CLAIMED', 'TICKET_REPLY', 'TICKET_RESOLVED', 'SESSION_UPDATE'])('accepts type %s', async (type) => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { logger: quietLogger() });
  await expect(send({ ...valid, notificationType: type })).resolves.toMatchObject({ ok: true });
  expect(store.writes).toHaveLength(1);
});

test.each([
  ['an unknown type', { notificationType: 'TICKET_DELETED' }],
  ['a lowercase type', { notificationType: 'ticket_claimed' }],
  ['a missing ticketId', { ticketId: undefined }],
  ['an empty ticketId', { ticketId: '' }],
  ['a whitespace ticketId', { ticketId: '   ' }],
  ['a non-string ticketId', { ticketId: 42 }],
  ['a missing recipient', { recipientUserId: undefined }],
  ['a non-string message', { message: { html: '<b>' } }],
])('rejects %s without a write', async (_label, change) => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { logger: quietLogger() });
  await expect(send({ ...valid, ...change })).resolves.toEqual({ ok: false, reason: 'INVALID_INPUT' });
  expect(store.attempts).toBe(0);
});

test('rejects a non-object input without a write', async () => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { logger: quietLogger() });
  await expect(send(null)).resolves.toEqual({ ok: false, reason: 'INVALID_INPUT' });
  await expect(send(['x'])).resolves.toEqual({ ok: false, reason: 'INVALID_INPUT' });
  expect(store.attempts).toBe(0);
});

test('trims and caps the message at 300 characters without splitting a code point', async () => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { logger: quietLogger() });
  await send({ ...valid, message: `   ${'a'.repeat(299)}😀😀 extra   ` });
  const stored = store.writes[0].data.message;
  expect(Array.from(stored)).toHaveLength(MAX_MESSAGE_LENGTH);
  expect(stored.endsWith('a😀')).toBe(true);

  await send({ ...valid, message: 'b'.repeat(300) });
  expect(store.writes[1].data.message).toHaveLength(300);
});

test('stores HTML-like message text unchanged as plain data', async () => {
  const store = fakeFirestore();
  const send = createNotify(store.db, { logger: quietLogger() });
  await send({ ...valid, message: '<script>alert(1)</script>' });
  expect(store.writes[0].data.message).toBe('<script>alert(1)</script>');
});

test('retries a failed write once with the same notification ID', async () => {
  const store = fakeFirestore({ failures: 1 });
  const logger = quietLogger();
  const send = createNotify(store.db, { newId: () => 'n-retry', logger });
  await expect(send(valid)).resolves.toEqual({ ok: true, notificationId: 'n-retry' });
  expect(store.attempts).toBe(2);
  expect(store.writes).toHaveLength(1);
  expect(logger.warn).not.toHaveBeenCalled();
});

test('a write that fails twice resolves without throwing and logs one non-sensitive line', async () => {
  const store = fakeFirestore({ failures: 2 });
  const logger = quietLogger();
  const send = createNotify(store.db, { logger });
  await expect(send({ ...valid, message: 'secret-ticket-title' })).resolves.toEqual({ ok: false, reason: 'WRITE_FAILED' });
  expect(store.attempts).toBe(2);
  expect(logger.warn).toHaveBeenCalledTimes(1);
  const line = logger.warn.mock.calls[0].join(' ');
  for (const sensitive of ['student-1', 'ticket-1', 'secret-ticket-title', 'synthetic storage failure']) {
    expect(line).not.toContain(sensitive);
  }
});

test('a ticket action that awaits notify still succeeds when the write fails', async () => {
  const store = fakeFirestore({ failures: 5 });
  const send = createNotify(store.db, { logger: quietLogger() });
  async function claimTicket() {
    const ticket = { ticketId: 'ticket-1', status: 'CLAIMED' };
    await send(valid);
    return ticket;
  }
  await expect(claimTicket()).resolves.toEqual({ ticketId: 'ticket-1', status: 'CLAIMED' });
});

test('a throwing logger does not reach the caller', async () => {
  const store = fakeFirestore({ failures: 2 });
  const send = createNotify(store.db, { logger: { warn() { throw new Error('log down'); } } });
  await expect(send(valid)).resolves.toEqual({ ok: false, reason: 'WRITE_FAILED' });
});

test('the shared notify export uses the configured store and is safe before configuration', async () => {
  const logger = quietLogger();
  configureNotify(null, { logger });
  await expect(notify(valid)).resolves.toEqual({ ok: false, reason: 'NOT_CONFIGURED' });
  const store = fakeFirestore();
  configureNotify(store.db, { newId: () => 'n-shared', logger });
  await expect(notify(valid)).resolves.toEqual({ ok: true, notificationId: 'n-shared' });
  expect(store.writes).toHaveLength(1);
  configureNotify(null);
});
