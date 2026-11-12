const fs = require('fs');
const path = require('path');
const { createFirestoreTicketStore } = require('../server/tickets/store');
const { createFirestoreNotificationStore } = require('../server/notifications/route');

const indexFile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firestore.indexes.json'), 'utf8'));
// The TA queue's indexes are the status-leading ticket indexes with createdAt
// ascending; the student activity indexes start with `studentId` or are on `replies`.
const bugFaqIndexFields = [
  { fieldPath: 'status', order: 'ASCENDING' },
  { fieldPath: 'createdAt', order: 'DESCENDING' },
  { fieldPath: '__name__', order: 'ASCENDING' },
];
const faqIndexes = indexFile.indexes.filter((i) => i.collectionGroup === 'tickets' &&
  JSON.stringify(i.fields) === JSON.stringify(bugFaqIndexFields));
const taQueueIndexes = indexFile.indexes.filter((i) => i.collectionGroup === 'tickets' &&
  i.fields[0].fieldPath === 'status' && i.fields[i.fields.length - 1].fieldPath !== '__name__' &&
  i.fields.some((field) => field.fieldPath === 'createdAt' && field.order === 'ASCENDING'));
const notificationIndexes = indexFile.indexes.filter((i) => i.collectionGroup === 'notifications');

/** Fake Firestore that records the where/orderBy calls a store method builds. */
function recordStoreQuery(run) {
  const wheres = [];
  const orders = [];
  const query = {
    where(field, op, value) { wheres.push({ field, op, value }); return query; },
    orderBy(field, dir) { orders.push({ field, dir }); return query; },
    startAfter() { return query; },
    limit() { return query; },
    async get() { return { docs: [] }; },
    doc() { return { collection: () => query, get: async () => ({ exists: false }) }; },
  };
  const db = { collection: () => query, runTransaction: async () => ({}) };
  const store = createFirestoreTicketStore(db, {
    firestore: { FieldValue: {}, Timestamp: { fromMillis: (ms) => ms } },
  });
  return Promise.resolve(run(store)).then(() => ({ wheres, orders }));
}

function recordQuery(filters) {
  return recordStoreQuery((store) => store.listTickets(filters));
}

/** The composite-index fields a recorded query needs: equality, then array-contains, then order. */
function requiredFields({ wheres, orders }) {
  const eq = wheres.filter((w) => w.op === '==' || w.op === 'in').map((w) => ({ fieldPath: w.field, order: 'ASCENDING' }));
  const arr = wheres.filter((w) => w.op === 'array-contains').map((w) => ({ fieldPath: w.field, arrayConfig: 'CONTAINS' }));
  // __name__ is implicit in every index, so only the other orderBy fields are listed.
  const ord = orders.filter((o) => o.field !== '__name__').map((o) => ({ fieldPath: o.field, order: o.dir === 'asc' ? 'ASCENDING' : 'DESCENDING' }));
  return [...eq, ...arr, ...ord];
}

const statuses = [undefined, 'ACTIVE', 'OPEN', 'CLAIMED', 'RESOLVED'];
const languages = [undefined, 'python'];
const concepts = [undefined, 'loops'];

describe('Firestore index file', () => {
  test('has only COLLECTION-scoped composite indexes and no overrides', () => {
    expect(indexFile.fieldOverrides).toEqual([]);
    for (const index of indexFile.indexes) {
      expect(['tickets', 'replies', 'notifications']).toContain(index.collectionGroup);
      expect(index.queryScope).toBe('COLLECTION');
    }
  });

  test('no index lists a field twice (catches indexes fused by a bad merge)', () => {
    for (const index of indexFile.indexes) {
      const names = index.fields.map((field) => field.fieldPath);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  test('contains exactly the student activity, TA queue and notification inbox indexes', () => {
    expect(indexFile.indexes).toHaveLength(2 + taQueueIndexes.length + notificationIndexes.length + faqIndexes.length);
    expect(taQueueIndexes).toHaveLength(4);
    expect(notificationIndexes).toHaveLength(1);
    expect(faqIndexes).toHaveLength(1);
  });
});

describe('Bug FAQ Firestore index', () => {
  test('matches the resolved-only descending timestamp and ascending document ID query exactly', async () => {
    const wheres = [];
    const orders = [];
    const query = {
      where(field, op, value) { wheres.push({ field, op, value }); return query; },
      orderBy(field, dir) { orders.push({ field, dir }); return query; },
      limit() { return query; },
      async get() { return { docs: [] }; },
    };
    const store = createFirestoreTicketStore({ collection: () => query });
    await store.searchFaq({ idHash: 'a'.repeat(64), studentId: 'student-1', query: 'loops', field: 'title' });

    expect(wheres).toEqual([{ field: 'status', op: '==', value: 'RESOLVED' }]);
    expect(orders).toEqual([
      { field: 'createdAt', dir: 'desc' },
      { field: '__name__', dir: 'asc' },
    ]);
    expect(faqIndexes).toHaveLength(1);
    expect(faqIndexes[0].queryScope).toBe('COLLECTION');
    expect(faqIndexes[0].fields).toEqual(bugFaqIndexFields);
  });
});

describe('notification inbox Firestore index', () => {
  test("a user's inbox list (recipient, newest first) has exactly one matching index", async () => {
    const wheres = [];
    const orders = [];
    const query = {
      where(field, op, value) { wheres.push({ field, op, value }); return query; },
      orderBy(field, dir = 'asc') { orders.push({ field, dir }); return query; },
      startAfter() { return query; },
      limit() { return query; },
      async get() { return { docs: [] }; },
    };
    const store = createFirestoreNotificationStore({ collection: () => query });
    await store.listForRecipient('user-1', null, 20);

    const needed = requiredFields({ wheres, orders });
    expect(needed).toEqual([
      { fieldPath: 'recipientUserId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ]);
    const matches = notificationIndexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    expect(matches).toHaveLength(1);
  });
});

describe('student activity Firestore indexes', () => {
  test("a student's active-ticket list has exactly one matching index", async () => {
    const needed = requiredFields(await recordStoreQuery((store) => store.listActive('student-1')));
    expect(needed).toEqual([
      { fieldPath: 'studentId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' },
      { fieldPath: 'ticketId', order: 'ASCENDING' },
    ]);
    const matches = indexFile.indexes.filter((i) => i.collectionGroup === 'tickets' && JSON.stringify(i.fields) === JSON.stringify(needed));
    expect(matches).toHaveLength(1);
  });

  test('ticket replies are ordered by an index on createdAt then replyId', () => {
    const matches = indexFile.indexes.filter((i) => i.collectionGroup === 'replies' && JSON.stringify(i.fields) === JSON.stringify([
      { fieldPath: 'createdAt', order: 'ASCENDING' },
      { fieldPath: 'replyId', order: 'ASCENDING' },
    ]));
    expect(matches).toHaveLength(1);
  });
});

describe('ta-ticket-queue Firestore indexes', () => {
  test('every TA queue index ends with createdAt ascending', () => {
    for (const index of taQueueIndexes) {
      expect(index.fields[index.fields.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
    }
  });

  for (const status of statuses) {
    for (const language of languages) {
      for (const concept of concepts) {
        test(`status=${status} language=${language} concept=${concept} has exactly one matching index`, async () => {
          const recorded = await recordQuery({ status, language, concept });
          expect(recorded.orders[recorded.orders.length - 1]).toEqual({ field: '__name__', dir: 'asc' });
          const needed = requiredFields(recorded);
          expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
          const matches = taQueueIndexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
          expect(matches).toHaveLength(1);
        });
      }
    }
  }

  test('every TA queue index is used by some query shape (no extra fields or indexes)', async () => {
    const used = new Set();
    for (const language of languages) {
      for (const concept of concepts) {
        used.add(JSON.stringify(requiredFields(await recordQuery({ status: 'OPEN', language, concept }))));
      }
    }
    expect(new Set(taQueueIndexes.map((i) => JSON.stringify(i.fields)))).toEqual(used);
  });
});
