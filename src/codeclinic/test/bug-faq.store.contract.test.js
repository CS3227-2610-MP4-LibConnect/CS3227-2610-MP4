const { Firestore, Timestamp, GeoPoint, DocumentReference } = require('@google-cloud/firestore');
const { createFirestoreTicketStore } = require('../server/tickets/store');
const { sealFaqToken, openFaqToken } = require('../server/tickets/faq-token');

const idHash = 'a'.repeat(64);
const studentId = 'viewer-student';
const timestamp = Timestamp.fromMillis(1_800_000_000_000);
const searchContext = (query = 'loop', field = 'title') => ({
  idHash, studentId, purpose: 'searchCursor', binding: { query, field },
});
const ticketDoc = (id, values = {}) => ({
  id,
  data: () => ({
    status: 'RESOLVED', title: 'Loop question', conceptTags: ['loops'], createdAt: timestamp,
    studentId: 'ticket-owner', claimedByTaId: 'ticket-ta', fixNote: 'Fixed', ...values,
  }),
});

describe('Bug FAQ Firestore store contract (T01)', () => {
  test('queries only RESOLVED tickets in stable order with a 100-document bound and safe projections', async () => {
    const operations = [];
    const query = {
      where(field, operator, value) { operations.push(['where', field, operator, value]); return this; },
      orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
      limit(value) { operations.push(['limit', value]); return this; },
      async get() {
        operations.push(['get']);
        return { docs: [
          ticketDoc('ticket-a', { title: 'A Loop <b>case</b>', conceptTags: ['arrays'], studentId: 'owner-a', fixNote: 'private', errorOutput: 'private' }),
          ticketDoc('ticket-b', { status: 'OPEN', title: 'Loop open', conceptTags: ['loops'] }),
          ticketDoc('ticket-c', { status: 'CLOSED', title: 'Loop closed', conceptTags: ['loops'] }),
          ticketDoc('ticket-d', { status: 'CLAIMED', title: 'Loop claimed', conceptTags: ['loops'] }),
          ticketDoc('ticket-e', { title: 'Loop case', conceptTags: ['loops'] }),
          ticketDoc('ticket-f', { title: 4, conceptTags: ['loops'] }),
        ] };
      },
    };
    const store = createFirestoreTicketStore({ collection(name) { operations.push(['collection', name]); return query; } });

    const result = await store.searchFaq({ idHash, studentId, query: ' loop ', field: 'title' });

    expect(operations[0]).toEqual(['collection', 'tickets']);
    expect(operations).toContainEqual(['where', 'status', '==', 'RESOLVED']);
    expect(operations).toContainEqual(['orderBy', 'createdAt', 'desc']);
    expect(operations).toContainEqual(['orderBy', '__name__', 'asc']);
    expect(operations).toContainEqual(['limit', 100]);
    expect(operations.findIndex((op) => op[0] === 'limit')).toBeLessThan(operations.findIndex((op) => op[0] === 'get'));
    expect(result.tickets).toEqual([
      { title: 'A Loop <b>case</b>', conceptTags: ['arrays'], faqRef: expect.any(String) },
      { title: 'Loop case', conceptTags: ['loops'], faqRef: expect.any(String) },
    ]);
    expect(result.tickets.every((ticket) => Object.keys(ticket).sort().join(',') === 'conceptTags,faqRef,title')).toBe(true);
    expect(result.tickets.map((ticket) => ticket.faqRef)).not.toContain('ticket-a');
    await expect(openFaqToken(result.tickets[0].faqRef, { idHash, studentId, purpose: 'faqRef', binding: {} }))
      .resolves.toEqual({ ticketId: 'ticket-a', v: 1 });
  });

  test('uses a stable timestamp/document-ID boundary and searches tags case-insensitively', async () => {
    const operations = [];
    const query = {
      where(field, operator, value) { operations.push(['where', field, operator, value]); return this; },
      orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
      startAfter(...values) { operations.push(['startAfter', ...values]); return this; },
      limit(value) { operations.push(['limit', value]); return this; },
      async get() { return { docs: [ticketDoc('ticket-b', { title: 'Other', conceptTags: ['linked lists'] })] }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });
    const cursor = await sealFaqToken({ v: 1, createdAt: { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds }, ticketId: 'ticket-a' }, searchContext('list', 'tags'));

    const result = await store.searchFaq({ idHash, studentId, query: ' LIST ', field: 'tags', cursor });

    expect(operations).toContainEqual(['where', 'status', '==', 'RESOLVED']);
    expect(operations).toContainEqual(['startAfter', timestamp, 'ticket-a']);
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0]).toMatchObject({ title: 'Other', conceptTags: ['linked lists'] });
  });

  test('caps each scan at 100 documents and stops at 20 matches with the last returned match as cursor', async () => {
    const docs = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: `loop-${i}` }));
    let queryLimit;
    const query = {
      where() { return this; }, orderBy() { return this; },
      limit(value) { queryLimit = value; return this; }, async get() { return { docs }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    const result = await store.searchFaq({ idHash, studentId, query: 'loop', field: 'title' });
    const cursor = await openFaqToken(result.nextCursor, searchContext());

    expect(queryLimit).toBe(100);
    expect(result.tickets).toHaveLength(20);
    expect(cursor).toMatchObject({ ticketId: 'ticket-19', v: 1 });
  });

  test('continues sparse matches from the last examined ticket without skipping later resolved matches', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: i === 99 ? 'needle' : 'other' }));
    const secondBatch = [ticketDoc('ticket-100', { title: 'needle again' })];
    const starts = [];
    let batch = firstBatch;
    const query = {
      where() { return this; }, orderBy() { return this; },
      startAfter(...values) { starts.push(values); batch = secondBatch; return this; },
      limit() { return this; }, async get() { return { docs: batch }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    const first = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' });
    const firstBoundary = await openFaqToken(first.nextCursor, searchContext('needle'));
    const second = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title', cursor: first.nextCursor });

    expect(first.tickets.map(({ title }) => title)).toEqual(['needle']);
    expect(firstBoundary).toMatchObject({ ticketId: 'ticket-99' });
    expect(starts[0]).toEqual([timestamp, 'ticket-99']);
    expect(second.tickets.map(({ title }) => title)).toEqual(['needle again']);
  });

  test.each([['beginning', 0], ['end', 99]])(
    'advances past malformed createdAt at the %s of a full scan batch', async (_position, malformedIndex) => {
      const firstBatch = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: 'other' }));
      firstBatch[malformedIndex] = ticketDoc(`ticket-${malformedIndex}`, {
        title: 'other', createdAt: 'malformed-timestamp',
      });
      const secondBatch = [ticketDoc('ticket-100', { title: 'needle after malformed timestamp' })];
      const starts = [];
      let batch = firstBatch;
      const query = {
        where() { return this; }, orderBy() { return this; },
        startAfter(...values) { starts.push(values); batch = secondBatch; return this; },
        limit() { return this; }, async get() { return { docs: batch }; },
      };
      const store = createFirestoreTicketStore({ collection: () => query });

      const first = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' });
      const firstBoundary = await openFaqToken(first.nextCursor, searchContext('needle'));
      const second = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title', cursor: first.nextCursor });

      expect(first.tickets).toEqual([]);
      expect(first.nextCursor).toEqual(expect.any(String));
      expect(firstBoundary.ticketId).toBe('ticket-99');
      expect(starts).toHaveLength(1);
      if (malformedIndex === 99) {
        expect(firstBoundary.createdAt).toBe('malformed-timestamp');
        expect(starts[0]).toEqual(['malformed-timestamp', 'ticket-99']);
      } else {
        expect(firstBoundary.createdAt).toMatchObject({ seconds: timestamp.seconds });
        expect(starts[0]).toEqual([timestamp, 'ticket-99']);
      }
      expect(second.tickets.map(({ title }) => title)).toEqual(['needle after malformed timestamp']);
    },
  );

  test('preserves a GeoPoint ordering value across a full-batch continuation', async () => {
    const geoPoint = new GeoPoint(1.25, -2.5);
    const firstBatch = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: 'other' }));
    firstBatch[99] = ticketDoc('ticket-99', { title: 'other', createdAt: geoPoint });
    const secondBatch = [ticketDoc('ticket-100', { title: 'needle after geopoint' })];
    const starts = [];
    let batch = firstBatch;
    const query = {
      where() { return this; }, orderBy() { return this; },
      startAfter(...values) { starts.push(values); batch = secondBatch; return this; },
      limit() { return this; }, async get() { return { docs: batch }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    const first = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' });
    const boundary = await openFaqToken(first.nextCursor, searchContext('needle'));
    const second = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title', cursor: first.nextCursor });

    expect(boundary.createdAt).toMatchObject({
      __faqCursorValueType: 'geoPoint', latitude: 1.25, longitude: -2.5,
    });
    expect(starts[0][0]).toBeInstanceOf(GeoPoint);
    expect(starts[0][0].latitude).toBe(1.25);
    expect(starts[0][0].longitude).toBe(-2.5);
    expect(starts[0][1]).toBe('ticket-99');
    expect(second.tickets.map(({ title }) => title)).toEqual(['needle after geopoint']);
  });

  test('preserves a map-shaped seconds/nanoseconds value as a map boundary', async () => {
    const mapValue = { seconds: 42, nanoseconds: 17 };
    const firstBatch = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: 'other' }));
    firstBatch[99] = ticketDoc('ticket-99', { title: 'other', createdAt: mapValue });
    const secondBatch = [ticketDoc('ticket-100', { title: 'needle after map' })];
    const starts = [];
    let batch = firstBatch;
    const query = {
      where() { return this; }, orderBy() { return this; },
      startAfter(...values) { starts.push(values); batch = secondBatch; return this; },
      limit() { return this; }, async get() { return { docs: batch }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    const first = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' });
    const boundary = await openFaqToken(first.nextCursor, searchContext('needle'));
    const second = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title', cursor: first.nextCursor });

    expect(boundary.createdAt).toEqual({
      __faqCursorValueType: 'map', value: [['seconds', 42], ['nanoseconds', 17]],
    });
    expect(starts[0][0]).toEqual(mapValue);
    expect(starts[0][0]).not.toBeInstanceOf(Timestamp);
    expect(second.tickets.map(({ title }) => title)).toEqual(['needle after map']);
  });

  test('preserves project and database identity for a DocumentReference boundary', async () => {
    const sourceDb = new Firestore({ projectId: 'faq-source-project', databaseId: 'faq-source-database' });
    const sourceReference = sourceDb.doc('sourceCollection/sourceDocument');
    const firstBatch = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: 'other' }));
    firstBatch[99] = ticketDoc('ticket-99', { title: 'other', createdAt: sourceReference });
    const secondBatch = [ticketDoc('ticket-100', { title: 'needle after reference' })];
    const starts = [];
    let batch = firstBatch;
    const query = {
      where() { return this; }, orderBy() { return this; },
      startAfter(...values) { starts.push(values); batch = secondBatch; return this; },
      limit() { return this; }, async get() { return { docs: batch }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    const first = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' });
    const boundary = await openFaqToken(first.nextCursor, searchContext('needle'));
    const second = await store.searchFaq({ idHash, studentId, query: 'needle', field: 'title', cursor: first.nextCursor });

    expect(boundary.createdAt).toMatchObject({
      __faqCursorValueType: 'reference',
      projectId: 'faq-source-project',
      databaseId: 'faq-source-database',
      path: 'sourceCollection/sourceDocument',
    });
    expect(starts[0][0]).toBeInstanceOf(DocumentReference);
    expect(starts[0][0].firestore.projectId).toBe('faq-source-project');
    expect(starts[0][0].firestore.databaseId).toBe('faq-source-database');
    expect(starts[0][0].path).toBe('sourceCollection/sourceDocument');
    expect(starts[0][1]).toBe('ticket-99');
    expect(second.tickets.map(({ title }) => title)).toEqual(['needle after reference']);
  });

  test.each([
    ['large map', Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`key-${i}`, i]))],
    ['large map key', { ['k'.repeat(400)]: 'value' }],
    ['nested array', [[[[[[['x'.repeat(400)]]]]]]]],
    ['bytes', Buffer.alloc(400, 1)],
  ])('fails safely for an unencodable %s boundary when a full batch may continue', async (_kind, createdAt) => {
    const docs = Array.from({ length: 100 }, (_, i) => ticketDoc(`ticket-${i}`, { title: 'other' }));
    docs[99] = ticketDoc('ticket-99', { title: 'other', createdAt });
    const query = {
      where() { return this; }, orderBy() { return this; }, limit() { return this; },
      async get() { return { docs }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });

    await expect(store.searchFaq({ idHash, studentId, query: 'needle', field: 'title' }))
      .rejects.toMatchObject({ code: 'CURSOR_UNENCODABLE' });
  });

  test('rejects a cursor bound to another query before issuing a Firestore read', async () => {
    const query = { where() { return this; }, orderBy() { return this; }, limit() { return this; }, get: jest.fn() };
    const store = createFirestoreTicketStore({ collection: () => query });
    const cursor = await sealFaqToken({ v: 1, createdAt: { seconds: timestamp.seconds, nanoseconds: 0 }, ticketId: 'ticket-a' }, searchContext());

    await expect(store.searchFaq({ idHash, studentId, query: 'different', field: 'title', cursor })).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
    expect(query.get).not.toHaveBeenCalled();
  });

  test('rechecks RESOLVED status and returns a bounded safe detail projection with member replies only', async () => {
    const replyTimestamp = Timestamp.fromMillis(1_800_000_000_010);
    const operations = [];
    const replyQuery = {
      orderBy(field, direction) { operations.push(['replyOrderBy', field, direction]); return this; },
      limit(value) { operations.push(['replyLimit', value]); return this; },
      async get() { return { docs: [
        { id: 'reply-student', data: () => ({ replyId: 'reply-student', ticketId: 'ticket-a', authorUserId: 'owner-a', message: 'name in body', createdAt: replyTimestamp }) },
        { id: 'reply-ta', data: () => ({ replyId: 'reply-ta', ticketId: 'ticket-a', authorUserId: 'ta-a', message: 'fixed', createdAt: replyTimestamp }) },
        { id: 'reply-foreign', data: () => ({ replyId: 'reply-foreign', ticketId: 'ticket-other', authorUserId: 'ta-a', message: 'exclude', createdAt: replyTimestamp }) },
       ] };
      },
    };
    const ticketRef = {
      id: 'ticket-a',
      async get() { operations.push(['ticketGet']); return { exists: true, id: 'ticket-a', data: () => ({
        status: 'RESOLVED', studentId: 'owner-a', claimedByTaId: 'ta-a', title: 'Question',
        conceptTags: ['loops'], fixNote: 'Fixed it', errorOutput: 'private',
      }) }; },
      collection(name) { operations.push(['subcollection', name]); return replyQuery; },
    };
    const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ticketRef }) });
    const faqRef = await sealFaqToken({ v: 1, ticketId: 'ticket-a' }, { idHash, studentId, purpose: 'faqRef', binding: {} });

    const result = await store.getFaqDetail(studentId, faqRef, { idHash });

    expect(result.ticket).toEqual({
      ticketId: 'ticket-a', studentId: 'owner-a', claimedByTaId: 'ta-a', status: 'RESOLVED',
      title: 'Question', conceptTags: ['loops'], fixNote: 'Fixed it',
    });
    expect(result.replies.map(({ replyId, authorUserId, message }) => ({ replyId, authorUserId, message }))).toEqual([
      { replyId: 'reply-student', authorUserId: 'owner-a', message: 'name in body' },
      { replyId: 'reply-ta', authorUserId: 'ta-a', message: 'fixed' },
    ]);
    expect(result.replies.some(({ message }) => message === 'exclude')).toBe(false);
    expect(operations).toContainEqual(['replyLimit', 51]);
    expect(result.ticket).not.toHaveProperty('errorOutput');
  });

  test('uses a reply cursor tied to the same FAQ reference and refuses CLOSED tickets', async () => {
    const operations = [];
    const replyBoundary = Timestamp.fromMillis(1_800_000_000_030);
    const faqRef = await sealFaqToken({ v: 1, ticketId: 'ticket-a' }, { idHash, studentId, purpose: 'faqRef', binding: {} });
    const cursor = await sealFaqToken({ v: 1, ticketId: 'ticket-a', replyId: 'reply-49', createdAt: { seconds: replyBoundary.seconds, nanoseconds: replyBoundary.nanoseconds } }, {
      idHash, studentId, purpose: 'replyCursor', binding: { faqRef },
    });
    const replyQuery = {
      orderBy() { return this; }, startAfter(...values) { operations.push(['startAfter', ...values]); return this; },
      limit() { return this; }, async get() { return { docs: [] }; },
    };
    const ticketRef = {
      id: 'ticket-a', async get() { operations.push(['ticketGet']); return { exists: true, id: 'ticket-a', data: () => ({
        status: 'CLOSED', studentId: 'owner-a', claimedByTaId: null, title: 'Closed', conceptTags: [], fixNote: null,
      }) }; }, collection: () => replyQuery,
    };
    const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ticketRef }) });

    await expect(store.getFaqDetail(studentId, faqRef, { idHash, cursor })).resolves.toBeNull();
    expect(operations).toContainEqual(['ticketGet']);
    expect(operations.some(([operation]) => operation === 'startAfter')).toBe(false);
  });

  test('caps reply pages at 50 and encrypts a cursor bound to the FAQ reference', async () => {
    const replyTimestamp = Timestamp.fromMillis(1_800_000_000_050);
    const operations = [];
    const replies = Array.from({ length: 51 }, (_, index) => ({
      id: `reply-${String(index).padStart(2, '0')}`,
      data: () => ({ replyId: `reply-${String(index).padStart(2, '0')}`, ticketId: 'ticket-a', authorUserId: 'owner-a', message: `reply ${index}`, createdAt: replyTimestamp }),
    }));
    let docs = replies;
    const replyQuery = {
      orderBy(field, direction) { operations.push(['orderBy', field, direction]); return this; },
      startAfter(...values) { operations.push(['startAfter', ...values]); docs = []; return this; },
      limit(value) { operations.push(['limit', value]); return this; },
      async get() { return { docs }; },
    };
    const ticketRef = {
      id: 'ticket-a',
      async get() { return { exists: true, id: 'ticket-a', data: () => ({
        status: 'RESOLVED', studentId: 'owner-a', claimedByTaId: 'ta-a', title: 'Question', conceptTags: [], fixNote: 'Fixed',
      }) }; },
      collection: () => replyQuery,
    };
    const store = createFirestoreTicketStore({ collection: () => ({ doc: () => ticketRef }) });
    const faqRef = await sealFaqToken({ v: 1, ticketId: 'ticket-a' }, { idHash, studentId, purpose: 'faqRef', binding: {} });

    const first = await store.getFaqDetail(studentId, faqRef, { idHash });
    const cursorPayload = await openFaqToken(first.nextCursor, {
      idHash, studentId, purpose: 'replyCursor', binding: { faqRef },
    });
    const second = await store.getFaqDetail(studentId, faqRef, { idHash, cursor: first.nextCursor });

    expect(first.replies).toHaveLength(50);
    expect(operations).toContainEqual(['limit', 51]);
    expect(operations).toContainEqual(['orderBy', 'createdAt', 'asc']);
    expect(operations).toContainEqual(['orderBy', 'replyId', 'asc']);
    expect(cursorPayload).toMatchObject({ ticketId: 'ticket-a', replyId: 'reply-49', v: 1 });
    expect(operations).toContainEqual(['startAfter', replyTimestamp, 'reply-49']);
    expect(second.replies).toEqual([]);
    expect(second.nextCursor).toBeNull();
  });
});
