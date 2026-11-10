// T01 (spec C1, C2, R1, R2; scenarios 3-6): the in-memory ticket store and cursor encoding.
// The Firestore store must expose the same interface; it is exercised by the emulator test (T05).
const { createInMemoryTicketStore, encodeCursor, decodeCursor } = require('../server/tickets/store');
const { makeTicket, makeReply, T0 } = require('./helpers/ta-tickets-harness');

const TA_A = 'ta-a';
const TA_B = 'ta-b';
const ms = (value) => new Date(value).getTime();

function makeStore() {
  let clock = T0 + 60 * 60 * 1000;
  let n = 0;
  const store = createInMemoryTicketStore({ now: () => clock, newId: () => `rid-${++n}` });
  return { store, setClock: (v) => { clock = v; }, tick: () => clock };
}

describe('cursor encoding', () => {
  test('round-trips createdAt and ticketId and is an opaque url-safe string', () => {
    const cursor = encodeCursor({ createdAt: new Date(T0 + 5000), ticketId: 't-0007' });
    expect(typeof cursor).toBe('string');
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+=*$/);
    expect(cursor).not.toContain('t-0007');
    expect(decodeCursor(cursor)).toEqual({ createdAtMs: T0 + 5000, ticketId: 't-0007' });
  });

  test.each([
    [''],
    ['not a cursor'],
    ['%%%'],
    [Buffer.from('not json').toString('base64url')],
    [Buffer.from('{}').toString('base64url')],
    [Buffer.from('[]').toString('base64url')],
    [Buffer.from(JSON.stringify({ createdAtMs: 'x', ticketId: 't' })).toString('base64url')],
    [Buffer.from(JSON.stringify({ createdAtMs: 1, ticketId: 5 })).toString('base64url')],
    [Buffer.from(JSON.stringify({ createdAtMs: 1, ticketId: '' })).toString('base64url')],
    [Buffer.from(JSON.stringify({ createdAtMs: 1, ticketId: 'a'.repeat(500) })).toString('base64url')],
    ['A'.repeat(5000)],
    [undefined],
    [null],
    [42],
    [{ createdAtMs: 1, ticketId: 't' }],
  ])('decodeCursor rejects bad input %#', (bad) => {
    expect(decodeCursor(bad)).toBeNull();
  });
});

describe('listTickets (R1)', () => {
  function seedMany(store, count, { language = 'Python', conceptTags = ['loops'] } = {}) {
    for (let i = 0; i < count; i += 1) {
      store.seedTicket(makeTicket(`t-${String(i).padStart(3, '0')}`, {
        createdAt: new Date(T0 + i * 1000), language, conceptTags,
      }));
    }
  }

  test('ACTIVE returns OPEN and CLAIMED only, oldest first', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-3', { createdAt: new Date(T0 + 3000), status: 'CLAIMED', claimedByTaId: TA_A }));
    store.seedTicket(makeTicket('t-1', { createdAt: new Date(T0 + 1000) }));
    store.seedTicket(makeTicket('t-2', { createdAt: new Date(T0 + 2000), status: 'RESOLVED', claimedByTaId: TA_A, fixNote: 'x', resolvedAt: new Date(T0) }));
    store.seedTicket(makeTicket('t-4', { createdAt: new Date(T0 + 4000), status: 'CLOSED' }));
    const { tickets, nextCursor } = await store.listTickets({ status: 'ACTIVE' });
    expect(tickets.map((t) => t.ticketId)).toEqual(['t-1', 't-3']);
    expect(nextCursor).toBeNull();
  });

  test.each(['OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED'])('status %s returns only that status', async (status) => {
    const { store } = makeStore();
    ['OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED'].forEach((s, i) => store.seedTicket(makeTicket(`t-${s}`, {
      status: s, createdAt: new Date(T0 + i * 1000), claimedByTaId: s === 'CLAIMED' || s === 'RESOLVED' ? TA_A : null,
    })));
    const { tickets } = await store.listTickets({ status });
    expect(tickets.map((t) => t.ticketId)).toEqual([`t-${status}`]);
  });

  test('language and concept filters are exact matches and combine with status', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('py-loops', { language: 'Python', conceptTags: ['loops', 'lists'], createdAt: new Date(T0) }));
    store.seedTicket(makeTicket('py-recursion', { language: 'Python', conceptTags: ['recursion'], createdAt: new Date(T0 + 1000) }));
    store.seedTicket(makeTicket('java-loops', { language: 'Java', conceptTags: ['loops'], createdAt: new Date(T0 + 2000) }));
    store.seedTicket(makeTicket('c-loopsy', { language: 'C', conceptTags: ['loopsy'], createdAt: new Date(T0 + 3000) }));
    const ids = async (filters) => (await store.listTickets({ status: 'ACTIVE', ...filters })).tickets.map((t) => t.ticketId);
    expect(await ids({ language: 'Python' })).toEqual(['py-loops', 'py-recursion']);
    expect(await ids({ concept: 'loops' })).toEqual(['py-loops', 'java-loops']);
    expect(await ids({ language: 'Python', concept: 'loops' })).toEqual(['py-loops']);
    expect(await ids({ language: 'C++' })).toEqual([]);
    expect(await ids({ concept: 'loop' })).toEqual([]);
  });

  test('pages are 20 long, oldest first, with no gaps or duplicates, and the last cursor is null', async () => {
    const { store } = makeStore();
    seedMany(store, 45);
    const seen = [];
    const sizes = [];
    let cursor;
    do {
      const page = await store.listTickets({ status: 'ACTIVE', cursor });
      sizes.push(page.tickets.length);
      seen.push(...page.tickets.map((t) => t.ticketId));
      cursor = page.nextCursor;
    } while (cursor);
    expect(sizes).toEqual([20, 20, 5]);
    expect(seen).toEqual(Array.from({ length: 45 }, (_, i) => `t-${String(i).padStart(3, '0')}`));
  });

  test('exactly 20 tickets returns a single page with a null cursor', async () => {
    const { store } = makeStore();
    seedMany(store, 20);
    const page = await store.listTickets({ status: 'ACTIVE' });
    expect(page.tickets).toHaveLength(20);
    expect(page.nextCursor).toBeNull();
  });

  test('tickets with identical createdAt are ordered stably and are not skipped across a page boundary', async () => {
    const { store } = makeStore();
    for (let i = 0; i < 25; i += 1) {
      store.seedTicket(makeTicket(`same-${String(i).padStart(2, '0')}`, { createdAt: new Date(T0) }));
    }
    const first = await store.listTickets({ status: 'ACTIVE' });
    const second = await store.listTickets({ status: 'ACTIVE', cursor: first.nextCursor });
    const all = [...first.tickets, ...second.tickets].map((t) => t.ticketId);
    expect(new Set(all).size).toBe(25);
    expect(second.nextCursor).toBeNull();
  });

  test('a malformed cursor is rejected rather than treated as the first page', async () => {
    const { store } = makeStore();
    seedMany(store, 3);
    await expect(store.listTickets({ status: 'ACTIVE', cursor: 'garbage!!' })).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
  });
});

describe('getTicket (R2)', () => {
  test('returns null for a missing ticket', async () => {
    const { store } = makeStore();
    expect(await store.getTicket('nope')).toBeNull();
  });

  test('returns the stored ticket with replies oldest first', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1'));
    store.seedReply('t-1', makeReply('r-b', 't-1', TA_A, 20));
    store.seedReply('t-1', makeReply('r-a', 't-1', 'stu', 10));
    store.seedReply('t-1', makeReply('r-c', 't-1', TA_B, 30));
    const ticket = await store.getTicket('t-1');
    expect(ticket.ticketId).toBe('t-1');
    expect(ticket.replies.map((r) => r.replyId)).toEqual(['r-a', 'r-b', 'r-c']);
  });

  test('returns at most 200 replies, the oldest 200', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1'));
    for (let i = 0; i < 205; i += 1) store.seedReply('t-1', makeReply(`r-${String(i).padStart(3, '0')}`, 't-1', TA_A, i));
    const ticket = await store.getTicket('t-1');
    expect(ticket.replies).toHaveLength(200);
    expect(ticket.replies[0].replyId).toBe('r-000');
    expect(ticket.replies[199].replyId).toBe('r-199');
  });

  test('replies of one ticket never appear on another', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1'));
    store.seedTicket(makeTicket('t-2'));
    store.seedReply('t-1', makeReply('r-1', 't-1', TA_A, 1));
    expect((await store.getTicket('t-2')).replies).toEqual([]);
  });
});

describe('claimTicket (R3, C2)', () => {
  test('OPEN becomes CLAIMED for the actor and updatedAt is set by the store clock', async () => {
    const { store, tick } = makeStore();
    store.seedTicket(makeTicket('t-1'));
    const result = await store.claimTicket('t-1', TA_A);
    expect(result.ok).toBe(true);
    const ticket = await store.getTicket('t-1');
    expect(ticket.status).toBe('CLAIMED');
    expect(ticket.claimedByTaId).toBe(TA_A);
    expect(ms(ticket.updatedAt)).toBe(tick());
    expect(ms(ticket.createdAt)).toBe(T0);
  });

  test.each([
    ['CLAIMED by someone else', { status: 'CLAIMED', claimedByTaId: TA_B }],
    ['CLAIMED by the same TA', { status: 'CLAIMED', claimedByTaId: TA_A }],
    ['RESOLVED', { status: 'RESOLVED', claimedByTaId: TA_B, fixNote: 'done', resolvedAt: new Date(T0) }],
    ['CLOSED', { status: 'CLOSED' }],
  ])('a %s ticket is a CONFLICT and nothing changes', async (_name, overrides) => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1', overrides));
    const before = JSON.stringify(await store.getTicket('t-1'));
    expect(await store.claimTicket('t-1', TA_A)).toEqual({ ok: false, reason: 'CONFLICT' });
    expect(JSON.stringify(await store.getTicket('t-1'))).toBe(before);
  });

  test('a missing ticket is NOT_FOUND', async () => {
    const { store } = makeStore();
    expect(await store.claimTicket('nope', TA_A)).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });

  test('two concurrent claims leave exactly one winner (scenario 3)', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1'));
    const results = await Promise.all([store.claimTicket('t-1', TA_A), store.claimTicket('t-1', TA_B)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'CONFLICT')).toHaveLength(1);
    const winner = results[0].ok ? TA_A : TA_B;
    expect((await store.getTicket('t-1')).claimedByTaId).toBe(winner);
  });
});

describe('unclaimTicket (R4)', () => {
  test('the claimer returns the ticket to OPEN with claimedByTaId null', async () => {
    const { store, setClock } = makeStore();
    store.seedTicket(makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: TA_A }));
    setClock(T0 + 7_200_000);
    expect((await store.unclaimTicket('t-1', TA_A)).ok).toBe(true);
    const ticket = await store.getTicket('t-1');
    expect(ticket.status).toBe('OPEN');
    expect(ticket.claimedByTaId).toBeNull();
    expect(ms(ticket.updatedAt)).toBe(T0 + 7_200_000);
  });

  test.each([
    ['another TA (scenario 4)', 'CLAIMED', TA_A, TA_B],
    ['an OPEN ticket', 'OPEN', null, TA_A],
    ['a RESOLVED ticket', 'RESOLVED', TA_A, TA_A],
    ['a CLOSED ticket', 'CLOSED', null, TA_A],
  ])('%s is a CONFLICT with no change', async (_name, status, claimer, actor) => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1', { status, claimedByTaId: claimer, ...(status === 'RESOLVED' ? { fixNote: 'n', resolvedAt: new Date(T0) } : {}) }));
    const before = JSON.stringify(await store.getTicket('t-1'));
    expect(await store.unclaimTicket('t-1', actor)).toEqual({ ok: false, reason: 'CONFLICT' });
    expect(JSON.stringify(await store.getTicket('t-1'))).toBe(before);
  });

  test('a missing ticket is NOT_FOUND', async () => {
    const { store } = makeStore();
    expect(await store.unclaimTicket('nope', TA_A)).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
});

describe('resolveTicket (R6)', () => {
  test('the claimer resolves: status, fixNote, resolvedAt, and updatedAt are set; claimedByTaId is kept', async () => {
    const { store, tick } = makeStore();
    store.seedTicket(makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: TA_A }));
    expect((await store.resolveTicket('t-1', TA_A, 'Use <= in the loop bound.')).ok).toBe(true);
    const ticket = await store.getTicket('t-1');
    expect(ticket.status).toBe('RESOLVED');
    expect(ticket.fixNote).toBe('Use <= in the loop bound.');
    expect(ms(ticket.resolvedAt)).toBe(tick());
    expect(ms(ticket.updatedAt)).toBe(tick());
    expect(ticket.claimedByTaId).toBe(TA_A);
  });

  test.each([
    ['another TA (scenario 4)', 'CLAIMED', TA_A, TA_B],
    ['an OPEN ticket', 'OPEN', null, TA_A],
    ['a CLOSED ticket', 'CLOSED', null, TA_A],
  ])('%s is a CONFLICT with no change', async (_name, status, claimer, actor) => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1', { status, claimedByTaId: claimer }));
    const before = JSON.stringify(await store.getTicket('t-1'));
    expect(await store.resolveTicket('t-1', actor, 'note')).toEqual({ ok: false, reason: 'CONFLICT' });
    expect(JSON.stringify(await store.getTicket('t-1'))).toBe(before);
  });

  test('a resolved ticket cannot be resolved again, so the fix note is permanent', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: TA_A }));
    await store.resolveTicket('t-1', TA_A, 'first');
    expect(await store.resolveTicket('t-1', TA_A, 'second')).toEqual({ ok: false, reason: 'CONFLICT' });
    expect((await store.getTicket('t-1')).fixNote).toBe('first');
  });

  test('a missing ticket is NOT_FOUND', async () => {
    const { store } = makeStore();
    expect(await store.resolveTicket('nope', TA_A, 'n')).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
});

describe('addReply (R5)', () => {
  test.each([['OPEN', null], ['CLAIMED', TA_A]])('adds a reply on a %s ticket and bumps updatedAt', async (status, claimer) => {
    const { store, tick } = makeStore();
    store.seedTicket(makeTicket('t-1', { status, claimedByTaId: claimer }));
    const result = await store.addReply('t-1', { authorUserId: TA_B, message: 'Try printing the index.' });
    expect(result.ok).toBe(true);
    expect(result.reply).toMatchObject({ replyId: 'rid-1', ticketId: 't-1', authorUserId: TA_B, message: 'Try printing the index.' });
    expect(ms(result.reply.createdAt)).toBe(tick());
    const ticket = await store.getTicket('t-1');
    expect(ticket.replies).toHaveLength(1);
    expect(ticket.status).toBe(status);
    expect(ticket.claimedByTaId).toBe(claimer);
    expect(ms(ticket.updatedAt)).toBe(tick());
  });

  test.each([['RESOLVED', { claimedByTaId: TA_A, fixNote: 'n', resolvedAt: new Date(T0) }], ['CLOSED', {}]])(
    'a %s ticket is a CONFLICT and no reply is stored (scenario 5)', async (status, extra) => {
      const { store } = makeStore();
      store.seedTicket(makeTicket('t-1', { status, ...extra }));
      expect(await store.addReply('t-1', { authorUserId: TA_A, message: 'late' })).toEqual({ ok: false, reason: 'CONFLICT' });
      expect((await store.getTicket('t-1')).replies).toEqual([]);
    });

  test('a missing ticket is NOT_FOUND', async () => {
    const { store } = makeStore();
    expect(await store.addReply('nope', { authorUserId: TA_A, message: 'x' })).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });

  test('a reply racing with a resolve either lands before it or conflicts, never after', async () => {
    const { store } = makeStore();
    store.seedTicket(makeTicket('t-1', { status: 'CLAIMED', claimedByTaId: TA_A }));
    const [reply, resolve] = await Promise.all([
      store.addReply('t-1', { authorUserId: TA_B, message: 'racing' }),
      store.resolveTicket('t-1', TA_A, 'done'),
    ]);
    expect(resolve.ok).toBe(true);
    const ticket = await store.getTicket('t-1');
    expect(ticket.replies).toHaveLength(reply.ok ? 1 : 0);
  });
});
