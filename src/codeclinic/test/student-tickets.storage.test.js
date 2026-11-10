const { Timestamp } = require('@google-cloud/firestore');
const { createFirestoreTicketStore } = require('../server/tickets/store');

test('creates one C1 ticket document at the generated ticket path', async () => {
  const writes = [];
  const timestamp = Timestamp.fromMillis(1_800_000_000_000);
  const db = {
    collection(name) {
      return {
        doc(id) {
          const ticketId = id || 'generated-ticket-id';
          return {
            id: ticketId,
            async create(value) { writes.push({ path: `${name}/${ticketId}`, value }); },
          };
        },
      };
    },
  };
  const store = createFirestoreTicketStore(db, { timestampNow: () => timestamp });
  const ticketId = await store.create('student-1', {
    title: 'Loop question', language: 'TypeScript', conceptTags: [], files: [], repoUrl: null,
    repoFilePaths: [], errorOutput: null, expectedBehaviour: 'Expected', actualBehaviour: 'Actual', attempted: 'Tried',
  });

  expect(ticketId).toBe('generated-ticket-id');
  expect(writes).toHaveLength(1);
  expect(writes[0].path).toBe('tickets/generated-ticket-id');
  expect(writes[0].value).toMatchObject({
    ticketId, studentId: 'student-1', status: 'OPEN', claimedByTaId: null,
    fixNote: null, resolvedAt: null, conceptTags: [], files: [], repoUrl: null,
    repoFilePaths: [], errorOutput: null,
  });
  expect(writes[0].value.createdAt).toBe(timestamp);
  expect(writes[0].value.updatedAt).toBe(timestamp);
  expect(writes[0].value.createdAt).toBeInstanceOf(Timestamp);
  expect(Object.keys(writes[0].value).sort()).toEqual([
    'ticketId', 'studentId', 'title', 'language', 'conceptTags', 'files', 'repoUrl', 'repoFilePaths',
    'errorOutput', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'status', 'claimedByTaId',
    'fixNote', 'createdAt', 'updatedAt', 'resolvedAt',
  ].sort());
});

test('lists only safe active-ticket summary fields from the bounded query', async () => {
  const operations = [];
  const ticket = {
    ticketId: 'ticket-1', title: 'Question', language: 'TypeScript', conceptTags: ['loops'], status: 'OPEN',
    updatedAt: Timestamp.fromMillis(1_800_000_000_000), studentId: 'student-1', errorOutput: 'sensitive',
  };
  const query = {
    where(field, operator, value) { operations.push(['where', field, operator, value]); return this; },
    orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
    limit(value) { operations.push(['limit', value]); return this; },
    async get() { operations.push(['get']); return { docs: [{ data: () => ticket }] }; },
  };
  const store = createFirestoreTicketStore({ collection(name) { operations.push(['collection', name]); return query; } });
  const result = await store.listActive('student-1');
  expect(result).toEqual([{
    ticketId: 'ticket-1', title: 'Question', language: 'TypeScript', conceptTags: ['loops'], status: 'OPEN',
    updatedAt: ticket.updatedAt,
  }]);
  expect(result[0]).not.toHaveProperty('studentId');
  expect(result[0]).not.toHaveProperty('errorOutput');
  expect(operations).toContainEqual(['limit', 5]);
});

test('reads the first bounded reply block in stable timestamp and ID order', async () => {
  const operations = [];
  const repliesQuery = {
    orderBy(field, direction) { operations.push(['replyOrderBy', field, direction]); return this; },
    limit(value) { operations.push(['replyLimit', value]); return this; },
    async get() {
      operations.push(['repliesGet']);
      return { docs: [
        { id: 'reply-a', data: () => ({ authorUserId: 'student-1', message: 'first', createdAt: 'same' }) },
        { id: 'reply-b', data: () => ({ authorUserId: 'ta-1', message: 'second', createdAt: 'same' }) },
      ] };
    },
  };
  const storedTicket = {
    ticketId: 'ticket-1', studentId: 'student-1', title: 'Title', language: 'TypeScript', conceptTags: [],
    files: [], repoUrl: null, repoFilePaths: [], errorOutput: null, expectedBehaviour: 'expected',
    actualBehaviour: 'actual', attempted: 'tried', status: 'OPEN', claimedByTaId: null, fixNote: null,
    createdAt: 'created', updatedAt: 'updated', resolvedAt: null, arbitrarySecret: 'never-return',
  };
  const ticketRef = {
    id: 'ticket-1',
    async get() { operations.push(['ticketGet']); return { exists: true, id: 'ticket-1', data: () => storedTicket }; },
    collection(name) { operations.push(['subcollection', name]); return repliesQuery; },
  };
  const store = createFirestoreTicketStore({ collection(name) {
    operations.push(['collection', name]);
    return { doc(id) { operations.push(['doc', id]); return ticketRef; } };
  } });
  const result = await store.getOwned('student-1', 'ticket-1');
  expect(result.ticket).toMatchObject({ ticketId: 'ticket-1', title: 'Title', status: 'OPEN' });
  expect(result.ticket).not.toHaveProperty('studentId');
  expect(result.ticket).not.toHaveProperty('arbitrarySecret');
  expect(result.replies).toEqual([
    { replyId: 'reply-a', authorUserId: 'student-1', message: 'first', createdAt: 'same' },
    { replyId: 'reply-b', authorUserId: 'ta-1', message: 'second', createdAt: 'same' },
  ]);
  expect(operations).toContainEqual(['replyOrderBy', 'createdAt', 'asc']);
  expect(operations).toContainEqual(['replyOrderBy', 'replyId', 'asc']);
  expect(operations).toContainEqual(['replyLimit', 50]);
  expect(operations.findIndex((op) => op[0] === 'repliesGet')).toBeGreaterThanOrEqual(0);
  expect(operations.findIndex((op) => op[0] === 'replyLimit')).toBeLessThan(operations.findIndex((op) => op[0] === 'repliesGet'));
});

test('continues a reply block from the stable createdAt and replyId boundary', async () => {
  const operations = [];
  const repliesQuery = {
    orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
    startAfter(...values) { operations.push(['startAfter', ...values]); return this; },
    limit(value) { operations.push(['limit', value]); return this; },
    async get() { operations.push(['get']); return { docs: [] }; },
  };
  const ticketRef = {
    async get() { return { exists: true, id: 'ticket-1', data: () => ({ studentId: 'student-1' }) }; },
    collection: () => repliesQuery,
  };
  const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ticketRef }) });
  await store.getOwned('student-1', 'ticket-1', { cursor: { createdAt: 'same', replyId: 'reply-50' } });
  expect(operations).toContainEqual(['startAfter', 'same', 'reply-50']);
  expect(operations).toContainEqual(['limit', 50]);
  expect(operations.findIndex((op) => op[0] === 'limit')).toBeLessThan(operations.findIndex((op) => op[0] === 'get'));
});

test('checks for a further reply with a separate one-document probe after a full block', async () => {
  const operations = [];
  let queryNumber = 0;
  const makeQuery = () => ({
    orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
    startAfter(...values) { operations.push(['startAfter', ...values]); return this; },
    limit(value) { operations.push(['limit', value]); this.pageLimit = value; return this; },
    async get() {
      operations.push(['get', this.pageLimit]);
      queryNumber += 1;
      if (queryNumber === 1) return { docs: Array.from({ length: 50 }, (_, i) => ({
        id: `reply-${i}`, data: () => ({ replyId: `reply-${i}`, authorUserId: 'student-1', message: 'text',
          createdAt: Timestamp.fromMillis(1000 + i) }),
      })) };
      return { docs: [{ id: 'reply-50' }] };
    },
  });
  const ticketRef = {
    async get() { return { exists: true, id: 'ticket-1', data: () => ({ studentId: 'student-1' }) }; },
    collection: () => makeQuery(),
  };
  const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ticketRef }) });
  const result = await store.getOwned('student-1', 'ticket-1');
  expect(result.replies).toHaveLength(50);
  expect(result.hasMore).toBe(true);
  expect(result.pageCursor).toEqual({ createdAt: result.replies[49].createdAt, replyId: 'reply-49' });
  expect(operations.filter(([operation]) => operation === 'limit')).toEqual([['limit', 50], ['limit', 1]]);
  expect(operations.filter(([operation]) => operation === 'get')).toEqual([['get', 50], ['get', 1]]);
  expect(operations).toContainEqual(['startAfter', result.replies[49].createdAt, 'reply-49']);
});

test('does not read replies when a ticket is absent or owned by another Student', async () => {
  const repliesCollection = jest.fn();
  const snapshots = [
    { exists: false, id: 'ticket-1', data: () => null },
    { exists: true, id: 'ticket-1', data: () => ({ studentId: 'student-2' }) },
  ];
  const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ({
    async get() { return snapshots.shift(); },
    collection: repliesCollection,
  }) }) });
  expect(await store.getOwned('student-1', 'ticket-1')).toBeNull();
  expect(await store.getOwned('student-1', 'ticket-1')).toBeNull();
  expect(repliesCollection).not.toHaveBeenCalled();
});

function transactionalTicketStore(initialTicket, timestampNow = () => Timestamp.fromMillis(2000), beforeRead = () => {}) {
  const writes = [];
  let ticket = initialTicket && { ...initialTicket };
  const db = {
    collection(name) {
      return {
        doc(id) {
          const path = `${name}/${id || 'generated-reply-id'}`;
          return {
            id: id || 'generated-reply-id', path,
            collection(subcollection) { return db.collection(`${path}/${subcollection}`); },
            async get() { return { exists: !!ticket, data: () => ticket }; },
          };
        },
      };
    },
    async runTransaction(callback) {
      const pending = [];
      const result = await callback({
        async get(ref) {
          writes.push(['transaction-get', ref.path]);
          beforeRead((value) => { ticket = { ...ticket, ...value }; });
          return { exists: !!ticket, data: () => ticket };
        },
        create(ref, value) { pending.push(['create', ref.path, value]); },
        update(ref, value) { pending.push(['update', ref.path, value]); },
      });
      for (const write of pending) {
        writes.push(write);
        if (write[0] === 'update') ticket = { ...ticket, ...write[2] };
      }
      return result;
    },
  };
  return { store: createFirestoreTicketStore(db, { timestampNow }), writes, ticket: () => ticket };
}

test.each(['OPEN', 'CLAIMED'])('transactionally creates a reply and advances updatedAt on %s', async (status) => {
  const before = Timestamp.fromMillis(1000);
  const after = Timestamp.fromMillis(2000);
  const fixture = transactionalTicketStore({ ticketId: 'ticket-1', studentId: 'student-1', status,
    claimedByTaId: status === 'CLAIMED' ? 'ta-1' : null, fixNote: null, resolvedAt: null, updatedAt: before });
  const result = await fixture.store.reply('student-1', 'ticket-1', 'a plain reply');
  expect(result.kind).toBe('OK');
  expect(result.replyId).toBe('generated-reply-id');
  expect(result.createdAt).toBeInstanceOf(Timestamp);
  expect(result.updatedAt.toMillis()).toBe(after.toMillis());
  expect(fixture.ticket().updatedAt.toMillis()).toBe(after.toMillis());
  expect(fixture.writes[0]).toEqual(['transaction-get', 'tickets/ticket-1']);
  expect(fixture.writes[1]).toMatchObject(['create', 'tickets/ticket-1/replies/generated-reply-id', {
    replyId: 'generated-reply-id', ticketId: 'ticket-1', authorUserId: 'student-1', message: 'a plain reply', createdAt: after,
  }]);
  expect(fixture.writes[2]).toEqual(['update', 'tickets/ticket-1', { updatedAt: after }]);
});

test('transaction re-reads status and rejects a concurrent transition to terminal state', async () => {
  const before = Timestamp.fromMillis(1000);
  const fixture = transactionalTicketStore({ ticketId: 'ticket-1', studentId: 'student-1', status: 'OPEN',
    claimedByTaId: null, fixNote: null, resolvedAt: null, updatedAt: before },
  () => Timestamp.fromMillis(2000), (change) => change({ status: 'RESOLVED' }));
  const result = await fixture.store.reply('student-1', 'ticket-1', 'reply');
  expect(result).toEqual({ kind: 'CONFLICT' });
  expect(fixture.writes).toEqual([['transaction-get', 'tickets/ticket-1']]);
  expect(fixture.ticket().status).toBe('RESOLVED');
  expect(fixture.ticket().updatedAt).toBe(before);
});

test.each([
  ['non-owner', { studentId: 'student-2', status: 'OPEN' }, 'student-1', 'NOT_FOUND'],
  ['closed ticket', { studentId: 'student-1', status: 'CLOSED' }, 'student-1', 'CONFLICT'],
  ['resolved ticket', { studentId: 'student-1', status: 'RESOLVED' }, 'student-1', 'CONFLICT'],
])('refuses reply writes for %s after transactional read', async (_label, ticket, studentId, expectedKind) => {
  const fixture = transactionalTicketStore({ ticketId: 'ticket-1', claimedByTaId: null, fixNote: null,
    resolvedAt: null, updatedAt: Timestamp.fromMillis(1000), ...ticket });
  const result = await fixture.store.reply(studentId, 'ticket-1', 'reply');
  expect(result.kind).toBe(expectedKind);
  expect(fixture.writes).toEqual([['transaction-get', 'tickets/ticket-1']]);
});

test.each(['OPEN', 'CLAIMED'])('transactionally closes %s and clears C2 state without resolution', async (status) => {
  const before = Timestamp.fromMillis(1000);
  const after = Timestamp.fromMillis(2000);
  const fixture = transactionalTicketStore({ ticketId: 'ticket-1', studentId: 'student-1', status,
    claimedByTaId: status === 'CLAIMED' ? 'ta-1' : null, fixNote: null, resolvedAt: null, updatedAt: before }, () => after);
  const result = await fixture.store.close('student-1', 'ticket-1');
  expect(result).toEqual({ kind: 'OK', updatedAt: after });
  expect(fixture.ticket()).toMatchObject({ status: 'CLOSED', claimedByTaId: null, fixNote: null, resolvedAt: null, updatedAt: after });
  expect(fixture.writes).toEqual([
    ['transaction-get', 'tickets/ticket-1'],
    ['update', 'tickets/ticket-1', { status: 'CLOSED', claimedByTaId: null, fixNote: null, resolvedAt: null, updatedAt: after }],
  ]);
});

test('does not close a terminal ticket or let an owner replace another Student state', async () => {
  const fixture = transactionalTicketStore({ ticketId: 'ticket-1', studentId: 'student-1', status: 'RESOLVED',
    claimedByTaId: null, fixNote: 'resolved', resolvedAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) });
  const result = await fixture.store.close('student-1', 'ticket-1');
  expect(result).toEqual({ kind: 'CONFLICT' });
  expect(fixture.writes).toEqual([['transaction-get', 'tickets/ticket-1']]);
  expect(fixture.ticket().fixNote).toBe('resolved');
});
