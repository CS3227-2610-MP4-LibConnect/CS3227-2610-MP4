// T04 (spec ai-ta-assist R2, R5; scenarios 1, 2, 3, 4, 7, 9, 11): POST /api/ta/tickets/:ticketId/fix-note-draft
// with a stub gateway on app.locals.aiGateway (no network, no real key).
// Assumed: registerTaAiFeatures(gateway) is exported from server/tickets/ta-ai-draft-route.js; the
// error body is { code, message }; the route passes the store ticket plus replies (each with
// message, authorRole, createdAt) as `input`, which the real FIX_NOTE_DRAFTER.buildUserContent accepts.
const {
  makeStubGateway, buildAiSystem, R5, INJECTION, makeTicket, makeReply, IDS, withAuth, snapshot,
} = require('./helpers/ta-ai-harness');
const request = require('supertest');
const { createAiGateway } = require('../server/ai/gateway');
const { validateFeatureDefinition } = require('../server/ai/features');
const { registerTaAiFeatures } = require('../server/tickets/ta-ai-draft-route');
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');
const { QUEUE_INSIGHTS } = require('../server/tickets/ta-ai-insights');

const URL = '/api/ta/tickets/tk-draft-1/fix-note-draft';
const ID = 'tk-draft-1';
const post = (system, actor, { url = URL, body, csrf = true } = {}) => {
  const req = withAuth(request(system.app).post(url), actor, { csrf });
  return body === undefined ? req : req.send(body);
};
const okGateway = (draft = 'The loop ran one step too far. Use range(len(xs)).') =>
  makeStubGateway(async () => ({ ok: true, data: { draft } }));

function seedClaimed(system, over = {}) {
  system.ticketStore.seedTicket(makeTicket(ID, {
    status: 'CLAIMED', claimedByTaId: IDS.taA, repoUrl: 'https://github.com/secret-org/secret-repo',
    repoFilePaths: ['src/secret/path.py'], ...over,
  }));
}

describe('who may request a draft (scenarios 1, 2)', () => {
  test('the claimer of a CLAIMED ticket gets 200 { draft } and the stub is called once', async () => {
    const gateway = okGateway('A fine note.');
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ draft: 'A fine note.' });
    expect(gateway.run).toHaveBeenCalledTimes(1);
  });

  test('calls the gateway with FIX_NOTE_DRAFTER and the server-resolved TA as actor (scenario 11)', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    await post(system, taA).set('X-Account-Type', 'STUDENT');
    const call = gateway.run.mock.calls[0][0];
    expect(call.feature).toBe('FIX_NOTE_DRAFTER');
    expect(call.actor).toMatchObject({ userId: IDS.taA, accountType: 'TA' });
    expect(call.input).toBeTruthy();
  });

  test.each([
    ['OPEN', { status: 'OPEN', claimedByTaId: null }],
    ['RESOLVED', { status: 'RESOLVED', claimedByTaId: IDS.taA, fixNote: 'done' }],
    ['CLOSED', { status: 'CLOSED', claimedByTaId: null }],
    ['CLAIMED by another TA', { status: 'CLAIMED', claimedByTaId: IDS.taB }],
  ])('a TA on a %s ticket gets 409 and the gateway is not called', async (_name, over) => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket(ID, over));
    const before = await snapshot(system.ticketStore, ID);
    const response = await post(system, taA);
    expect(response.status).toBe(409);
    expect(gateway.run).not.toHaveBeenCalled();
    expect(await snapshot(system.ticketStore, ID)).toEqual(before);
  });

  test('a missing ticket (or a malformed id) returns 404 without calling the gateway', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    expect((await post(system, taA, { url: '/api/ta/tickets/nope/fix-note-draft' })).status).toBe(404);
    expect((await post(system, taA, { url: '/api/ta/tickets/bad%20id/fix-note-draft' })).status).toBe(404);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test('a student gets 403, a signed-out user 401, an INACTIVE TA 401; the gateway is never called', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { student, taA } = system.standardCast();
    seedClaimed(system);
    expect((await post(system, student)).status).toBe(403);
    expect((await request(system.app).post(URL).send({})).status).toBe(401);
    system.users.get(IDS.taA).accountStatus = 'INACTIVE';
    expect((await post(system, taA)).status).toBe(401);
    expect(gateway.run).not.toHaveBeenCalled();
  });
});

describe('CSRF and body checks (scenario 9)', () => {
  test('a missing or wrong CSRF token returns 403 and the gateway is not called', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    expect((await post(system, taA, { csrf: false })).status).toBe(403);
    expect((await post(system, taA, { csrf: false }).set('X-CSRF-Token', 'x'.repeat(43))).status).toBe(403);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test.each([
    ['a non-empty JSON body', (r) => r.send({ draft: 'inject' })],
    ['a text/plain body', (r) => r.set('Content-Type', 'text/plain').send('hello')],
    ['a form body', (r) => r.set('Content-Type', 'application/x-www-form-urlencoded').send('a=1')],
  ])('%s returns 400 and the gateway is not called', async (_name, shape) => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    const response = await shape(withAuth(request(system.app).post(URL), taA));
    expect(response.status).toBe(400);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  test('an empty JSON object body is accepted', async () => {
    const system = buildAiSystem(okGateway());
    const { taA } = system.standardCast();
    seedClaimed(system);
    expect((await post(system, taA, { body: {} })).status).toBe(200);
  });
});

describe('error mapping and fallback (R5; scenario 7)', () => {
  test.each(Object.entries(R5))('%s maps to its status, code, and fixed message with no provider detail', async (code, row) => {
    const gateway = makeStubGateway(async () => ({ ok: false, code, detail: 'PROVIDER-SECRET-DETAIL', prompt: 'LEAKED-PROMPT' }));
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    const response = await post(system, taA);
    expect(response.status).toBe(row.status);
    expect(response.body).toEqual({ code, message: row.FIX_NOTE_DRAFTER });
    expect(JSON.stringify(response.body)).not.toMatch(/SECRET-DETAIL|LEAKED-PROMPT/);
  });

  test('a missing gateway returns 503 AI_UNAVAILABLE and the attachment is read per request', async () => {
    const system = buildAiSystem(undefined);
    const { taA } = system.standardCast();
    seedClaimed(system);
    const missing = await post(system, taA);
    expect(missing.status).toBe(503);
    expect(missing.body).toEqual({ code: 'AI_UNAVAILABLE', message: R5.AI_UNAVAILABLE.FIX_NOTE_DRAFTER });
    system.app.locals.aiGateway = okGateway('Late gateway note.');
    expect((await post(system, taA)).body).toEqual({ draft: 'Late gateway note.' });
  });

  test('a real disabled gateway gives 503 without a provider call, then resolve still works', async () => {
    const fetch = jest.fn();
    const usageStore = { record: jest.fn(async () => undefined) };
    const gateway = createAiGateway({ env: {}, fetch, usageStore, logger: { info() {}, warn() {}, error() {} } });
    registerTaAiFeatures(gateway);
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);

    const draft = await post(system, taA);
    expect(draft.status).toBe(503);
    expect(draft.body).toEqual({ code: 'AI_UNAVAILABLE', message: R5.AI_UNAVAILABLE.FIX_NOTE_DRAFTER });
    expect(fetch).not.toHaveBeenCalled();

    const resolve = await post(system, taA, { url: `/api/ta/tickets/${ID}/resolve`, body: { fixNote: 'Written by the TA.' } });
    expect(resolve.status).toBe(200);
    expect((await system.ticketStore.getTicket(ID)).status).toBe('RESOLVED');
    expect((await system.ticketStore.getTicket(ID)).fixNote).toBe('Written by the TA.');
  });
});

describe('no writes and prompt-injection safety (scenarios 1, 3)', () => {
  test('a successful draft writes nothing: ticket, replies, and notifications are unchanged', async () => {
    const system = buildAiSystem(okGateway('Draft only.'));
    const { taA } = system.standardCast();
    seedClaimed(system);
    system.ticketStore.seedReply(ID, makeReply('r-1', ID, IDS.student, 10, 'My loop crashes'));
    const before = await snapshot(system.ticketStore, ID);
    expect((await post(system, taA)).status).toBe(200);
    expect(await snapshot(system.ticketStore, ID)).toEqual(before);
    expect(system.notify).not.toHaveBeenCalled();
  });

  test('injection text in the ticket and replies changes no state, and an injected draft is returned literally', async () => {
    const draftWithInjection = `${INJECTION} <script>alert(1)</script>`;
    const gateway = okGateway(draftWithInjection);
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system, { title: INJECTION, attempted: INJECTION, errorOutput: INJECTION });
    system.ticketStore.seedReply(ID, makeReply('r-1', ID, IDS.student, 10, INJECTION));
    const before = await snapshot(system.ticketStore, ID);
    const response = await post(system, taA);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ draft: draftWithInjection });
    const after = await snapshot(system.ticketStore, ID);
    expect(after).toEqual(before);
    expect(after.status).toBe('CLAIMED');
    expect(system.notify).not.toHaveBeenCalled();
  });

  test('the draft endpoint accepts no client-supplied text, role, or ticket data', async () => {
    const gateway = okGateway();
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system);
    const response = await post(system, taA, { url: `${URL}?status=RESOLVED&accountType=STUDENT` });
    expect(response.status).toBe(200);
    expect(gateway.run.mock.calls[0][0].actor.accountType).toBe('TA');
  });
});

describe('what the model sees (scenario 4)', () => {
  test('the prompt content has the fields, files, and replies by role, and no names, emails, IDs, or repoUrl', async () => {
    let content = null;
    const gateway = makeStubGateway(async (req) => {
      content = FIX_NOTE_DRAFTER.buildUserContent(req.input);
      return { ok: true, data: { draft: 'ok' } };
    });
    const system = buildAiSystem(gateway);
    const { taA } = system.standardCast();
    seedClaimed(system, { title: 'Prompt check title', files: [{ name: 'main.py', content: 'CODE-BODY-123' }] });
    system.ticketStore.seedReply(ID, makeReply('r-1', ID, IDS.student, 10, 'FIRST student words'));
    system.ticketStore.seedReply(ID, makeReply('r-2', ID, IDS.taA, 20, 'SECOND ta words'));
    expect((await post(system, taA)).status).toBe(200);

    ['Prompt check title', 'main.py', 'CODE-BODY-123', 'FIRST student words', 'SECOND ta words', 'IndexError'].forEach((text) => expect(content).toContain(text));
    expect(content.indexOf('FIRST student words')).toBeLessThan(content.indexOf('SECOND ta words'));
    expect(content.slice(Math.max(0, content.indexOf('FIRST student words') - 40), content.indexOf('FIRST student words'))).toMatch(/STUDENT/);
    expect(content.slice(Math.max(0, content.indexOf('SECOND ta words') - 40), content.indexOf('SECOND ta words'))).toMatch(/\bTA\b/);
    [ID, IDS.student, IDS.taA, IDS.taB, 'Sam Student', 'Alice TA', 'sam.student@example.edu', 'alice.ta@example.edu',
      'secret-org', 'src/secret/path.py'].forEach((value) => expect(content).not.toContain(value));
  });
});

describe('registerTaAiFeatures (startServer wiring)', () => {
  test('registers both valid definitions with the gateway', () => {
    const gateway = makeStubGateway();
    registerTaAiFeatures(gateway);
    const registered = gateway.register.mock.calls.map(([definition]) => definition);
    expect(registered.map((d) => d.feature).sort()).toEqual(['FIX_NOTE_DRAFTER', 'QUEUE_INSIGHTS']);
    registered.forEach((definition) => expect(validateFeatureDefinition(definition)).toEqual({ ok: true }));
    expect(registered).toContain(FIX_NOTE_DRAFTER);
    expect(registered).toContain(QUEUE_INSIGHTS);
  });

  test('server/index.js calls registerTaAiFeatures right after createAiGateway in startServer', () => {
    const source = require('fs').readFileSync(require('path').resolve(__dirname, '../server/index.js'), 'utf8');
    const created = source.indexOf('createAiGateway(');
    const registered = source.indexOf('registerTaAiFeatures(');
    expect(registered).toBeGreaterThan(-1);
    expect(registered).toBeGreaterThan(source.indexOf('app.locals.aiGateway'));
    expect(created).toBeGreaterThan(-1);
  });
});
