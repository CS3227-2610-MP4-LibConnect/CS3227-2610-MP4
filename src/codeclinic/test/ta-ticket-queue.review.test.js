// REVIEW-ONLY tests (independent reviewer, ta-ticket-queue spec v0.1). Not part of the
// approved test set. They cover gaps noted in the implementation report (F1 regression) and
// the Firestore store's in-transaction re-read, which the in-memory API tests cannot reach.
const { IDS, makeTicket, makeSystem, withAuth } = require('./helpers/ta-tickets-harness'); // sets TextEncoder globals first
const request = require('supertest');
const { createInMemoryTicketStore, createFirestoreTicketStore } = require('../server/tickets/store');
const { createTaTicketsRouter } = require('../server/tickets/ta-routes');

const BASE = '/api/ta/tickets';
const build = () => makeSystem({ createInMemoryTicketStore, createTaTicketsRouter });
const resolvedBy = (by) => ({ status: 'RESOLVED', claimedByTaId: by, fixNote: 'Fixed the bound', resolvedAt: new Date() });

describe('review: R2 claimedByMe on a RESOLVED ticket (F1 regression)', () => {
  test('the resolver sees claimedByMe true and their own name', async () => {
    const system = build();
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1', resolvedBy(IDS.taA)));
    const response = await withAuth(request(system.app).get(`${BASE}/t-1`), taA, { csrf: false });
    expect(response.status).toBe(200);
    expect(response.body.claimedByMe).toBe(true);
    expect(response.body.claimedByName).toBe('Alice TA');
  });

  test('another TA sees claimedByMe false and never the resolver ID', async () => {
    const system = build();
    const { taB } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1', resolvedBy(IDS.taA)));
    const response = await withAuth(request(system.app).get(`${BASE}/t-1`), taB, { csrf: false });
    expect(response.status).toBe(200);
    expect(response.body.claimedByMe).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain(IDS.taA);
    expect(JSON.stringify(response.body)).not.toContain(IDS.student);
  });

  test('the resolve action response itself reports claimedByMe true', async () => {
    const system = build();
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: IDS.taA }));
    const response = await withAuth(request(system.app).post(`${BASE}/t-1/resolve`), taA).send({ fixNote: 'done' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('RESOLVED');
    expect(response.body.claimedByMe).toBe(true);
  });

  test('a RESOLVED list item never carries the resolver identity', async () => {
    const system = build();
    const { taB } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1', resolvedBy(IDS.taA)));
    const response = await withAuth(request(system.app).get(`${BASE}?status=RESOLVED`), taB, { csrf: false });
    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain(IDS.taA);
  });
});

// Minimal fake Firestore: the transaction reads come from `docs`, which a test can change
// between the outer request and the transaction to simulate a concurrent writer.
function fakeFirestore(docs) {
  const writes = [];
  const SERVER_TS = { serverTimestamp: true };
  const repliesQuery = (ticketId) => {
    const q = { orderBy: () => q, limit: () => q, get: async () => ({ docs: (docs[`${ticketId}/replies`] || []).map((d) => ({ id: d.replyId, data: () => d })) }) };
    return q;
  };
  const ticketRef = (id) => ({
    id,
    path: `tickets/${id}`,
    get: async () => ({ exists: !!docs[id], id, data: () => ({ ...docs[id] }) }),
    collection: () => ({ doc: () => ({ id: 'r-new', path: `tickets/${id}/replies/r-new` }), ...repliesQuery(id) }),
  });
  const db = {
    collection: () => ({ doc: ticketRef }),
    runTransaction: async (fn) => fn({
      get: async (ref) => ({ exists: !!docs[ref.id], data: () => ({ ...docs[ref.id] }) }),
      update: (ref, changes) => writes.push({ op: 'update', path: ref.path, changes }),
      create: (ref, data) => writes.push({ op: 'create', path: ref.path, data }),
    }),
  };
  const deps = { firestore: { FieldValue: { serverTimestamp: () => SERVER_TS }, Timestamp: { fromMillis: (ms) => ms } } };
  return { store: createFirestoreTicketStore(db, deps), writes, SERVER_TS };
}

describe('review: Firestore store decides inside the transaction', () => {
  test('claim re-reads the ticket in the transaction: a ticket CLAIMED meanwhile gives CONFLICT and no write', async () => {
    const docs = { 't-1': makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: IDS.taB }) };
    const { store, writes } = fakeFirestore(docs);
    expect(await store.claimTicket('t-1', IDS.taA)).toEqual({ ok: false, reason: 'CONFLICT' });
    expect(writes).toEqual([]);
  });

  test('claim on OPEN writes only server-decided fields', async () => {
    const docs = { 't-1': makeTicket('t-1') };
    const { store, writes, SERVER_TS } = fakeFirestore(docs);
    const result = await store.claimTicket('t-1', IDS.taA);
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ op: 'update', path: 'tickets/t-1', changes: { status: 'CLAIMED', claimedByTaId: IDS.taA, updatedAt: SERVER_TS } }]);
  });

  test('unclaim and resolve by a non-holder give CONFLICT and no write', async () => {
    const docs = { 't-1': makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: IDS.taA }) };
    const { store, writes } = fakeFirestore(docs);
    expect((await store.unclaimTicket('t-1', IDS.taB)).reason).toBe('CONFLICT');
    expect((await store.resolveTicket('t-1', IDS.taB, 'note')).reason).toBe('CONFLICT');
    expect(writes).toEqual([]);
  });

  test('resolve keeps claimedByTaId and sets server timestamps', async () => {
    const docs = { 't-1': makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: IDS.taA }) };
    const { store, writes, SERVER_TS } = fakeFirestore(docs);
    expect((await store.resolveTicket('t-1', IDS.taA, 'note')).ok).toBe(true);
    expect(writes).toEqual([{ op: 'update', path: 'tickets/t-1', changes: { status: 'RESOLVED', fixNote: 'note', resolvedAt: SERVER_TS, updatedAt: SERVER_TS } }]);
  });

  test.each(['RESOLVED', 'CLOSED'])('reply on a %s ticket gives CONFLICT and creates no reply', async (status) => {
    const docs = { 't-1': makeTicket('t-1', { status }) };
    const { store, writes } = fakeFirestore(docs);
    expect((await store.addReply('t-1', { authorUserId: IDS.taA, message: 'hi' })).reason).toBe('CONFLICT');
    expect(writes).toEqual([]);
  });

  test('reply creates the reply and touches only updatedAt on the ticket, in one transaction', async () => {
    const docs = { 't-1': makeTicket('t-1') };
    const { store, writes, SERVER_TS } = fakeFirestore(docs);
    expect((await store.addReply('t-1', { authorUserId: IDS.taA, message: 'hi' })).ok).toBe(true);
    expect(writes).toEqual([
      { op: 'create', path: 'tickets/t-1/replies/r-new', data: { replyId: 'r-new', ticketId: 't-1', authorUserId: IDS.taA, message: 'hi', createdAt: SERVER_TS } },
      { op: 'update', path: 'tickets/t-1', changes: { updatedAt: SERVER_TS } },
    ]);
  });
});
