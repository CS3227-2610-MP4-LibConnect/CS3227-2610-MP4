// Review fixes L1, L2, L3, F1 (ta-ticket-queue spec v0.1 incl. the R1 amendment).
const { IDS, T0, makeTicket, makeSystem, withAuth } = require('./helpers/ta-tickets-harness'); // sets TextEncoder globals first
const request = require('supertest');
const { createInMemoryTicketStore, createFirestoreTicketStore, encodeCursor, decodeCursor } = require('../server/tickets/store');
const { createTaTicketsRouter } = require('../server/tickets/ta-routes');

const BASE = '/api/ta/tickets';
const build = () => makeSystem({ createInMemoryTicketStore, createTaTicketsRouter });

describe('L1: a body that was sent but not parsed as JSON is rejected', () => {
  const sendRaw = (system, path, actor, type, payload) => withAuth(request(system.app).post(path), actor)
    .set('Content-Type', type).send(payload);

  test.each([
    ['claim', 'text/plain', '{"status":"RESOLVED"}', {}],
    ['claim', 'application/x-www-form-urlencoded', 'status=RESOLVED', {}],
    ['unclaim', 'text/plain', 'x', { status: 'CLAIMED', claimedByTaId: IDS.taA }],
    ['resolve', 'text/plain', '{"fixNote":"ok"}', { status: 'CLAIMED', claimedByTaId: IDS.taA }],
    ['replies', 'application/x-www-form-urlencoded', 'message=hello', {}],
  ])('%s with %s returns 400 and changes nothing', async (action, type, payload, seed) => {
    const system = build();
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1', seed));
    const before = await system.ticketStore.getTicket('t-1');
    const response = await sendRaw(system, `${BASE}/t-1/${action}`, taA, type, payload);
    expect(response.status).toBe(400);
    expect(await system.ticketStore.getTicket('t-1')).toEqual(before);
    expect(system.notify).not.toHaveBeenCalled();
  });

  test('no body and an empty JSON object still succeed', async () => {
    const system = build();
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-1'));
    expect((await withAuth(request(system.app).post(`${BASE}/t-1/claim`), taA)).status).toBe(200);
    expect((await withAuth(request(system.app).post(`${BASE}/t-1/unclaim`), taA).send({})).status).toBe(200);
  });
});

// Fake Firestore whose reads outside the transaction can be made to fail.
function fakeFirestore(docs) {
  const state = { failOutside: false };
  const SERVER_TS = { serverTimestamp: true };
  const ticketRef = (id) => ({
    id,
    path: `tickets/${id}`,
    get: async () => {
      if (state.failOutside) throw new Error('read failed');
      return { exists: !!docs[id], id, data: () => ({ ...docs[id] }) };
    },
    collection: () => ({
      doc: () => ({ id: 'r-new', path: `tickets/${id}/replies/r-new` }),
      orderBy() { return this; },
      limit() { return this; },
      get: async () => { throw new Error('read failed'); },
    }),
  });
  const db = {
    collection: () => ({ doc: ticketRef }),
    runTransaction: async (fn) => fn({
      get: async (ref) => ({ exists: !!docs[ref.id], data: () => ({ ...docs[ref.id] }) }),
      update() {},
      create() {},
    }),
  };
  const deps = { now: () => T0 + 5000, firestore: { FieldValue: { serverTimestamp: () => SERVER_TS }, Timestamp: { fromMillis: (ms) => ms } } };
  return { store: createFirestoreTicketStore(db, deps), state };
}

describe('L2: Firestore results come from the transaction, not a post-commit reload', () => {
  test('claim, unclaim and resolve succeed with commit-time timestamps when the re-read fails', async () => {
    const docs = { 't-1': makeTicket('t-1', { title: 'Loop bug' }) };
    const { store, state } = fakeFirestore(docs);
    state.failOutside = true;
    const claimed = await store.claimTicket('t-1', IDS.taA);
    expect(claimed.ok).toBe(true);
    expect(claimed.ticket).toMatchObject({ ticketId: 't-1', status: 'CLAIMED', claimedByTaId: IDS.taA, title: 'Loop bug', studentId: IDS.student });
    expect(claimed.ticket.updatedAt).toEqual(new Date(T0 + 5000));

    docs['t-1'] = { ...docs['t-1'], status: 'CLAIMED', claimedByTaId: IDS.taA };
    const unclaimed = await store.unclaimTicket('t-1', IDS.taA);
    expect(unclaimed.ticket).toMatchObject({ status: 'OPEN', claimedByTaId: null });

    const resolved = await store.resolveTicket('t-1', IDS.taA, 'done');
    expect(resolved.ticket).toMatchObject({ status: 'RESOLVED', fixNote: 'done', claimedByTaId: IDS.taA });
    expect(resolved.ticket.resolvedAt).toEqual(new Date(T0 + 5000));
  });

  test('addReply returns the reply and ticket without re-reading', async () => {
    const docs = { 't-1': makeTicket('t-1', { title: 'Crash' }) };
    const { store, state } = fakeFirestore(docs);
    state.failOutside = true;
    const result = await store.addReply('t-1', { authorUserId: IDS.taA, message: 'hi' });
    expect(result.ok).toBe(true);
    expect(result.reply).toMatchObject({ replyId: 'r-new', message: 'hi', authorUserId: IDS.taA });
    expect(result.ticket).toMatchObject({ studentId: IDS.student, title: 'Crash' });
  });

  test('over HTTP the action returns 200 and notifies even when the re-read fails', async () => {
    const docs = { 't-1': makeTicket('t-1', { title: 'Loop bug' }) };
    const { store, state } = fakeFirestore(docs);
    state.failOutside = true;
    const system = makeSystem({ createInMemoryTicketStore: () => store, createTaTicketsRouter });
    const { taA } = system.standardCast();
    const response = await withAuth(request(system.app).post(`${BASE}/t-1/claim`), taA).send({});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'CLAIMED', claimedByMe: true });
    expect(system.notify).toHaveBeenCalledTimes(1);
  });
});

describe('L3: cursor bounds', () => {
  const enc = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

  test.each([
    ['huge createdAtMs', { createdAtMs: 1e20, ticketId: 'a' }],
    ['negative huge createdAtMs', { createdAtMs: -1e20, ticketId: 'a' }],
    ['slash in ticketId', { createdAtMs: T0, ticketId: 'a/b' }],
    ['dot-dot ticketId', { createdAtMs: T0, ticketId: '../x' }],
    ['overlong ticketId', { createdAtMs: T0, ticketId: 'a'.repeat(129) }],
  ])('decodeCursor rejects %s', (_n, value) => {
    expect(decodeCursor(enc(value))).toBeNull();
  });

  test('decodeCursor still accepts a normal cursor', () => {
    expect(decodeCursor(encodeCursor({ createdAt: new Date(T0), ticketId: 't-1' }))).toEqual({ createdAtMs: T0, ticketId: 't-1' });
  });

  test('the list route returns 400 for a crafted cursor', async () => {
    const system = build();
    const { taA } = system.standardCast();
    const cursor = enc({ createdAtMs: 1e20, ticketId: 'a/b' });
    const response = await withAuth(request(system.app).get(`${BASE}?cursor=${cursor}`), taA, { csrf: false });
    expect(response.status).toBe(400);
  });
});

describe('F1: list claimedByMe follows the detail rule', () => {
  test('the resolver sees claimedByMe true on a RESOLVED ticket, claimed false; others see false', async () => {
    const system = build();
    const { taA, taB } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-r', { status: 'RESOLVED', claimedByTaId: IDS.taA, fixNote: 'n', resolvedAt: new Date(T0) }));
    const item = async (actor) => (await withAuth(request(system.app).get(`${BASE}?status=RESOLVED`), actor, { csrf: false })).body.tickets[0];
    expect(await item(taA)).toMatchObject({ claimedByMe: true, claimed: false, status: 'RESOLVED' });
    expect(await item(taB)).toMatchObject({ claimedByMe: false, claimed: false });
  });

  test('a CLAIMED ticket is unchanged: claimed true, claimedByMe only for the claimer', async () => {
    const system = build();
    const { taA, taB } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('t-c', { status: 'CLAIMED', claimedByTaId: IDS.taA }));
    const item = async (actor) => (await withAuth(request(system.app).get(BASE), actor, { csrf: false })).body.tickets[0];
    expect(await item(taA)).toMatchObject({ claimed: true, claimedByMe: true });
    expect(await item(taB)).toMatchObject({ claimed: true, claimedByMe: false });
  });
});
