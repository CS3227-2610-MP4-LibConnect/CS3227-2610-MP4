const fs = require('fs');
const path = require('path');
const { createFirestoreTicketStore } = require('../server/tickets/store');

const indexFile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firestore.indexes.json'), 'utf8'));

/** Fake Firestore that records the where/orderBy calls listTickets builds. */
function recordQuery(filters) {
  const wheres = [];
  const orders = [];
  const query = {
    where(field, op, value) { wheres.push({ field, op, value }); return query; },
    orderBy(field, dir) { orders.push({ field, dir }); return query; },
    startAfter() { return query; },
    limit() { return query; },
    async get() { return { docs: [] }; },
  };
  const db = { collection: () => query, runTransaction: async () => ({}) };
  const store = createFirestoreTicketStore(db, {
    firestore: { FieldValue: {}, Timestamp: { fromMillis: (ms) => ms } },
  });
  return store.listTickets(filters).then(() => ({ wheres, orders }));
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

describe('ta-ticket-queue Firestore indexes', () => {
  test('file has only COLLECTION-scoped composite indexes on tickets and no overrides', () => {
    expect(indexFile.fieldOverrides).toEqual([]);
    expect(indexFile.indexes).toHaveLength(4);
    for (const index of indexFile.indexes) {
      expect(index.collectionGroup).toBe('tickets');
      expect(index.queryScope).toBe('COLLECTION');
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
          const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
          expect(matches).toHaveLength(1);
        });
      }
    }
  }

  test('every index is used by some query shape (no extra fields or indexes)', async () => {
    const used = new Set();
    for (const language of languages) {
      for (const concept of concepts) {
        used.add(JSON.stringify(requiredFields(await recordQuery({ status: 'OPEN', language, concept }))));
      }
    }
    expect(new Set(indexFile.indexes.map((i) => JSON.stringify(i.fields)))).toEqual(used);
  });
});
