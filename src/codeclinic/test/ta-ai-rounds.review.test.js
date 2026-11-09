// REVIEW-ONLY (ai-ta-assist improvement rounds 1-2 review, 2026-11-09). Not production tests; left uncommitted.
const fs = require('fs');
const path = require('path');
const { makeStubGateway, buildAiSystem, makeTicket, withAuth } = require('./helpers/ta-ai-harness'); // first: TextEncoder polyfill
const request = require('supertest');
const { SHARED_PREAMBLE, buildSystemMessage } = require('../server/ai/prompt');
const { FIX_NOTE_DRAFTER } = require('../server/tickets/ta-ai-fix-note');
const { QUEUE_INSIGHTS } = require('../server/tickets/ta-ai-insights');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const promptBlock = (src) => src.slice(src.indexOf('const SYSTEM_PROMPT = ['), src.indexOf("].join('\\n');"));

describe('review: prompts are fixed literals', () => {
  test.each([['server/tickets/ta-ai-fix-note.js'], ['server/tickets/ta-ai-insights.js']])('%s SYSTEM_PROMPT has no interpolation', (file) => {
    const block = promptBlock(read(file));
    expect(block.length).toBeGreaterThan(50);
    expect(block).not.toMatch(/`/);
    expect(block).not.toMatch(/\$\{/);
    expect(block).not.toMatch(/\+\s*[A-Za-z_]/);
  });

  test.each([[FIX_NOTE_DRAFTER], [QUEUE_INSIGHTS]])('system message keeps the shared preamble first and intact', (def) => {
    const msg = buildSystemMessage(def.systemPrompt);
    expect(msg.startsWith(`${SHARED_PREAMBLE}\n\n`)).toBe(true);
    expect(def.systemPrompt).not.toMatch(/<<<|>>>/);
    expect(def.systemPrompt).not.toMatch(/follow (the )?instructions in the ticket|obey/i);
  });

  test('insights prompt never asks for more than 8 groups or for real ids', () => {
    const p = QUEUE_INSIGHTS.systemPrompt;
    expect(p).toMatch(/Return at most 8 groups/);
    expect(p).toMatch(/limit of 8 groups always wins/);
    expect(p).not.toMatch(/ticketId|user id|email/i);
  });

  test('parsers and caps unchanged (R1, R3)', () => {
    expect(FIX_NOTE_DRAFTER.maxInputChars).toBe(16000);
    expect(FIX_NOTE_DRAFTER.maxOutputTokens).toBe(700);
    expect(QUEUE_INSIGHTS.maxInputChars).toBe(12000);
    expect(QUEUE_INSIGHTS.maxOutputTokens).toBe(1200);
    const g = (n) => ({ label: 'L', kind: 'CONCEPT', summary: 'S', aliases: [`T${n}`] });
    expect(QUEUE_INSIGHTS.parse({ groups: Array.from({ length: 8 }, (_, i) => g(i + 1)) }).ok).toBe(true);
    expect(QUEUE_INSIGHTS.parse({ groups: Array.from({ length: 9 }, (_, i) => g(i + 1)) }).ok).toBe(false);
    expect(FIX_NOTE_DRAFTER.parse({ draft: 'x' }).ok).toBe(true);
    expect(FIX_NOTE_DRAFTER.parse({ draft: 'x', extra: 1 }).ok).toBe(false);
  });
});

describe('review: T16 constants', () => {
  test('constants.js has no imports, so it cannot form a cycle', () => {
    expect(read('server/tickets/constants.js')).not.toMatch(/require\(/);
  });

  test('modules load in isolation in any order', () => {
    for (const order of [['ta-ai-shared', 'ta-claims'], ['ta-claims', 'ta-ai-shared'], ['ta-ai-draft-route', 'ta-routes']]) {
      jest.isolateModules(() => {
        for (const m of order) expect(() => require(`../server/tickets/${m}`)).not.toThrow();
        const shared = require('../server/tickets/ta-ai-shared');
        expect(typeof shared.requireEmptyJsonBody).toBe('function');
        expect(typeof require('../server/tickets/ta-claims').isEmptyBody).toBe('function');
      });
    }
  });

  test('claim body 400, AI body 400 and router 400 now share one text; 409 status unchanged', async () => {
    const gw = makeStubGateway(async () => ({ ok: true, data: { draft: 'x' } }));
    const system = buildAiSystem(gw);
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket('tk-rev-1', { status: 'OPEN', claimedByTaId: null }));
    const claim = await withAuth(request(system.app).post('/api/ta/tickets/tk-rev-1/claim'), taA).send({ x: 1 });
    const insights = await withAuth(request(system.app).post('/api/ta/tickets/insights'), taA).send({ x: 1 });
    expect(claim.status).toBe(400);
    expect(insights.status).toBe(400);
    expect(insights.body).toEqual({ message: claim.body.message });
    expect(gw.run).not.toHaveBeenCalled();
  });
});
