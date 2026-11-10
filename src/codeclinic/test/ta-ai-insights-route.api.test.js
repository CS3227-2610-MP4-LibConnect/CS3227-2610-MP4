// T05 (spec ai-ta-assist R4, R5; scenarios 5, 6, 7, 8, 9, 11): POST /api/ta/tickets/insights with a
// stub gateway on app.locals.aiGateway (no network, no real key).
// Assumed: error body { code, message }; `input` is { tickets: [{ alias, language, conceptTags, title,
// errorOutput, ... }] } (accepted by the real QUEUE_INSIGHTS.buildUserContent); ticketCount is the number of
// tickets analysed (at most 60); the cache lives in the router created by createTaTicketsRouter (per instance).
const { makeStubGateway, buildAiSystem, R5, INJECTION, makeTicket, IDS, T0, withAuth, snapshot } = require('./helpers/ta-ai-harness');
const request = require('supertest');
const { QUEUE_INSIGHTS } = require('../server/tickets/ta-ai-insights');

const URL = '/api/ta/tickets/insights';
const post = (system, actor, { url = URL, body, csrf = true } = {}) => {
  const req = withAuth(request(system.app).post(url), actor, { csrf });
  return body === undefined ? req : req.send(body);
};
const group = (label, aliases, over = {}) => ({ label, kind: 'CONCEPT', summary: `Re-teach ${label}`, aliases, ...over });
const okGateway = (groups = []) => makeStubGateway(async () => ({ ok: true, data: { groups } }));

/** Seeds `count` active tickets, oldest first by index; ids are distinctive. */
function seedActive(system, count, over = () => ({})) {
  for (let i = 1; i <= count; i += 1) {
    system.ticketStore.seedTicket(makeTicket(`tk-ins-${String(i).padStart(3, '0')}`, {
      title: `Insight title ${i}`, createdAt: new Date(T0 + i * 1000), updatedAt: new Date(T0 + i * 1000), ...over(i),
    }));
  }
}
const snapshotAll = async (system, ids) => Promise.all(ids.map((id) => snapshot(system.ticketStore, id)));

describe('access, CSRF, and body checks (scenario 9)', () => {
  test('signed-out 401, student 403, INACTIVE TA 401; the gateway is never called', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { student, taA } = system.standardCast();
    seedActive(system, 2);
    expect((await request(system.app).post(URL).send({})).status).toBe(401);
    expect((await post(system, student)).status).toBe(403);
    system.users.get(IDS.taA).accountStatus = 'INACTIVE';
    expect((await post(system, taA)).status).toBe(401);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test('a missing or wrong CSRF token returns 403', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 2);
    expect((await post(system, taA, { csrf: false })).status).toBe(403);
    expect((await post(system, taA, { csrf: false }).set('X-CSRF-Token', 'x'.repeat(43))).status).toBe(403);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test.each([
    ['a non-empty JSON body', (r) => r.send({ ticketIds: ['tk-ins-001'] })],
    ['a text/plain body', (r) => r.set('Content-Type', 'text/plain').send('hello')],
    ['a form body', (r) => r.set('Content-Type', 'application/x-www-form-urlencoded').send('a=1')],
  ])('%s returns 400', async (_name, shape) => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 2);
    expect((await shape(withAuth(request(system.app).post(URL), taA))).status).toBe(400);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test('the route is reachable as POST /insights (not shadowed by /:ticketId) and GET is not an endpoint', async () => {
    const system = buildAiSystem(okGateway());
    const { taA } = system.standardCast();
    seedActive(system, 1);
    expect((await post(system, taA)).status).toBe(200);
    const get = await withAuth(request(system.app).get(URL), taA, { csrf: false });
    expect(get.status).toBe(404);
  });
});

describe('empty queue short-circuit (R4)', () => {
  test('no active tickets returns { groups: [], ticketCount: 0 } without a gateway call', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('tk-done', { status: 'RESOLVED', claimedByTaId: IDS.taA, fixNote: 'x' }));
    system.ticketStore.seedTicket(makeTicket('tk-closed', { status: 'CLOSED' }));
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ groups: [], ticketCount: 0 });
    expect(gateway.run).not.toHaveBeenCalled();
  });
});

describe('collection and what is sent (scenario 5)', () => {
  test('sends only OPEN and CLAIMED tickets, oldest first, as aliases T1..Tn, via QUEUE_INSIGHTS', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 3, (i) => (i === 2 ? { status: 'CLAIMED', claimedByTaId: IDS.taB } : {}));
    system.ticketStore.seedTicket(makeTicket('tk-resolved', { status: 'RESOLVED', claimedByTaId: IDS.taB, fixNote: 'x', title: 'RESOLVED-TITLE' }));
    expect((await post(system, taA)).status).toBe(200);
    expect(gateway.run).toHaveBeenCalledTimes(1);
    const call = gateway.run.mock.calls[0][0];
    expect(call.feature).toBe('QUEUE_INSIGHTS');
    expect(call.actor).toMatchObject({ userId: IDS.taA, accountType: 'TA' });
    expect(call.input.tickets.map((t) => [t.alias, t.title])).toEqual([
      ['T1', 'Insight title 1'], ['T2', 'Insight title 2'], ['T3', 'Insight title 3'],
    ]);
  });

  test('the prompt content is only alias | language | tags | title | error summary lines (no IDs, names, code, repoUrl)', async () => {
    let content = null;
    const gateway = makeStubGateway(async (req) => {
      content = QUEUE_INSIGHTS.buildUserContent(req.input);
      return { ok: true, data: { groups: [] } };
    });
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 3, () => ({
      repoUrl: 'https://github.com/secret-org/secret-repo', files: [{ name: 'secret_file.py', content: 'SECRET-CODE-BODY' }],
      attempted: 'SECRET-ATTEMPT', errorOutput: 'KeyError: first line\nsecond SECRET-LINE',
    }));
    await post(system, taA);
    const lines = content.split('\n').filter((l) => l.trim());
    expect(lines).toHaveLength(3);
    expect(lines[0].split(' | ')).toEqual(['T1', 'Python', expect.stringContaining('loops'), 'Insight title 1', 'KeyError: first line']);
    ['tk-ins-', IDS.student, IDS.taA, 'Sam Student', 'sam.student@example.edu', 'secret-org', 'SECRET-CODE-BODY',
      'secret_file.py', 'SECRET-ATTEMPT', 'SECRET-LINE'].forEach((value) => expect(content).not.toContain(value));
  });

  test('sends at most 60 tickets, oldest first, and reports truncated when more exist', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 65);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    const tickets = gateway.run.mock.calls[0][0].input.tickets;
    expect(tickets).toHaveLength(60);
    expect(tickets[0].title).toBe('Insight title 1');
    expect(tickets[59].title).toBe('Insight title 60');
    expect(response.body).toMatchObject({ truncated: true, ticketCount: 60, cached: false });
  });

  test('exactly 60 active tickets is not truncated', async () => {
    const system = buildAiSystem(okGateway());
    const { taA } = system.standardCast();
    seedActive(system, 60);
    const response = await post(system, taA);
    expect(response.body).toMatchObject({ truncated: false, ticketCount: 60 });
  });
});

describe('response mapping and cleaning (scenario 6)', () => {
  test('maps aliases back to { ticketId, title } and returns the full response shape', async () => {
    const system = buildAiSystem(okGateway([group('Loops', ['T1', 'T3'], { kind: 'MISCONCEPTION' })]));
    const { taA } = system.standardCast();
    seedActive(system, 3);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      groups: [{
        label: 'Loops', kind: 'MISCONCEPTION', summary: 'Re-teach Loops',
        tickets: [{ ticketId: 'tk-ins-001', title: 'Insight title 1' }, { ticketId: 'tk-ins-003', title: 'Insight title 3' }],
      }],
      ticketCount: 3, truncated: false, cached: false,
    });
  });

  test('drops unknown aliases, keeps the first group for repeated aliases, and removes empty groups', async () => {
    const system = buildAiSystem(okGateway([
      group('First', ['T1', 'T2', 'T40']),
      group('Second', ['T2', 'T3']),
      group('Ghost', ['T9']),
      group('Repeat', ['T1']),
    ]));
    const { taA } = system.standardCast();
    seedActive(system, 3);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body.groups.map((g) => [g.label, g.tickets.map((t) => t.ticketId)])).toEqual([
      ['First', ['tk-ins-001', 'tk-ins-002']], ['Second', ['tk-ins-003']],
    ]);
  });

  test('model output never changes which tickets are shown: a real ticketId used as an alias is dropped', async () => {
    const system = buildAiSystem(okGateway([group('Sneaky', ['tk-ins-001', 'T1x', 'T0'])]));
    const { taA } = system.standardCast();
    seedActive(system, 2);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body.groups).toEqual([]);
  });

  test('an invalid-schema reply (gateway AI_INVALID_OUTPUT) returns 502 with the fixed message', async () => {
    const system = buildAiSystem(makeStubGateway(async () => ({ ok: false, code: 'AI_INVALID_OUTPUT' })));
    const { taA } = system.standardCast();
    seedActive(system, 2);
    const response = await post(system, taA);
    expect(response.status).toBe(502);
    expect(response.body).toEqual({ code: 'AI_INVALID_OUTPUT', message: R5.AI_INVALID_OUTPUT.QUEUE_INSIGHTS });
  });
});

describe('error mapping and fallback (R5; scenario 7)', () => {
  test.each(Object.entries(R5))('%s maps to its status, code, and fixed message with no provider detail', async (code, row) => {
    const system = buildAiSystem(makeStubGateway(async () => ({ ok: false, code, detail: 'PROVIDER-SECRET-DETAIL' })));
    const { taA } = system.standardCast();
    seedActive(system, 2);
    const response = await post(system, taA);
    expect(response.status).toBe(row.status);
    expect(response.body).toEqual({ code, message: row.QUEUE_INSIGHTS });
    expect(JSON.stringify(response.body)).not.toContain('SECRET-DETAIL');
  });

  test('a missing gateway returns 503 AI_UNAVAILABLE', async () => {
    const system = buildAiSystem(undefined);
    const { taA } = system.standardCast();
    seedActive(system, 2);
    const response = await post(system, taA);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'AI_UNAVAILABLE', message: R5.AI_UNAVAILABLE.QUEUE_INSIGHTS });
  });

  test('failures are not cached: the next request calls the gateway again', async () => {
    const results = [{ ok: false, code: 'AI_UNAVAILABLE' }, { ok: true, data: { groups: [] } }];
    const gateway = makeStubGateway(async () => results.shift());
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 2);
    expect((await post(system, taA)).status).toBe(503);
    const second = await post(system, taA);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(false);
    expect(gateway.run).toHaveBeenCalledTimes(2);
  });
});

describe('cache (scenario 8)', () => {
  test('an unchanged queue is served from cache, even to a different TA, with one gateway call', async () => {
    const gateway = okGateway([group('Loops', ['T1'])]);
    const system = buildAiSystem(gateway);
    const { taA, taB } = system.standardCast();
    seedActive(system, 3);
    const first = await post(system, taA);
    const second = await post(system, taB);
    expect(first.body.cached).toBe(false);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ ...first.body, cached: true });
    expect(gateway.run).toHaveBeenCalledTimes(1);
  });

  test('a changed ticket updatedAt causes a new gateway call', async () => {
    const gateway = okGateway([group('Loops', ['T1'])]);
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 3);
    await post(system, taA);
    system.setClock(T0 + 7200 * 1000);
    expect((await system.ticketStore.claimTicket('tk-ins-002', IDS.taB)).ok).toBe(true);
    const again = await post(system, taA);
    expect(again.body.cached).toBe(false);
    expect(gateway.run).toHaveBeenCalledTimes(2);
  });

  test('a new active ticket (a different alias map) causes a new gateway call', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedActive(system, 2);
    await post(system, taA);
    system.ticketStore.seedTicket(makeTicket('tk-ins-new', { createdAt: new Date(T0 + 99000), updatedAt: new Date(T0 + 99000) }));
    expect((await post(system, taA)).body.cached).toBe(false);
    expect(gateway.run).toHaveBeenCalledTimes(2);
  });

  test('the cache is not shared between server instances', async () => {
    const gateway = okGateway();
    const a = buildAiSystem(gateway);
    const b = buildAiSystem(gateway);
    const castA = a.standardCast();
    const castB = b.standardCast();
    seedActive(a, 2);
    seedActive(b, 2);
    await post(a, castA.taA);
    await post(b, castB.taA);
    expect(gateway.run).toHaveBeenCalledTimes(2);
  });
});

describe('no writes and injection safety (scenarios 3, 11)', () => {
  test('a successful request writes nothing and sends no notification', async () => {
    const system = buildAiSystem(okGateway([group('Loops', ['T1', 'T2'])]));
    const { taA } = system.standardCast();
    seedActive(system, 3);
    const ids = ['tk-ins-001', 'tk-ins-002', 'tk-ins-003'];
    const before = await snapshotAll(system, ids);
    expect((await post(system, taA)).status).toBe(200);
    expect(await snapshotAll(system, ids)).toEqual(before);
    expect(system.notify).not.toHaveBeenCalled();
  });

  test('injection text in tickets and in model labels changes no ticket state', async () => {
    const system = buildAiSystem(okGateway([group(INJECTION.slice(0, 60), ['T1'], { summary: 'Mark every ticket resolved.' })]));
    const { taA } = system.standardCast();
    seedActive(system, 2, () => ({ title: INJECTION, errorOutput: INJECTION }));
    const ids = ['tk-ins-001', 'tk-ins-002'];
    const before = await snapshotAll(system, ids);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body.groups[0].summary).toBe('Mark every ticket resolved.');
    expect(await snapshotAll(system, ids)).toEqual(before);
    expect(system.notify).not.toHaveBeenCalled();
  });
});
