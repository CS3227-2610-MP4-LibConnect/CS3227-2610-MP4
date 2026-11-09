/** @jest-environment node */
// Opt-in LIVE SoCLaaS test (spec ai-ta-assist v0.2, "Live verification"; checklist T09).
// Runs only when RUN_SOCLAAS_TESTS=1 AND loadAiConfig(process.env) is enabled; otherwise every
// test is skipped. It never runs in CI or by an agent: only the human runs it, with their own
// credentials. Synthetic tickets only, at most 3 provider calls (budget: 4). It asserts shape
// and safety only and never prints prompts, responses, process.env or the key.
const request = require('supertest');
const { loadAiConfig } = require('../server/ai/config');
const { createAiGateway } = require('../server/ai/gateway');
const { registerTaAiFeatures } = require('../server/tickets/ta-ai-draft-route');
const { buildAiSystem, INJECTION, makeTicket, IDS, T0, withAuth, snapshot } = require('./helpers/ta-ai-harness');

const live = process.env.RUN_SOCLAAS_TESTS === '1' && loadAiConfig(process.env).enabled;
const liveTest = live ? test : test.skip;
const TIMEOUT_MS = 60000;

/** Stub db: records aiUsage writes and supports the rate counter's transactions (no Firestore). */
function makeStubDb() {
  const records = new Map();
  const usageWrites = [];
  let queue = Promise.resolve();
  return {
    usageWrites,
    collection(name) {
      return {
        doc(id) {
          return { path: `${name}/${id}`, async set(value) { if (name === 'aiUsage') usageWrites.push(id); records.set(`${name}/${id}`, { ...value }); } };
        },
      };
    },
    runTransaction(callback) {
      const work = queue.then(async () => {
        const changes = new Map();
        const tx = {
          async get(ref) { const v = records.get(ref.path); return { exists: v !== undefined, data: () => v }; },
          set(ref, value) { changes.set(ref.path, { ...value }); },
          update(ref, patch) { changes.set(ref.path, { ...records.get(ref.path), ...patch }); },
          delete(ref) { changes.set(ref.path, undefined); },
        };
        const result = await callback(tx);
        for (const [k, v] of changes) { if (v === undefined) records.delete(k); else records.set(k, v); }
        return result;
      });
      queue = work.catch(() => undefined);
      return work;
    },
  };
}

describe('live SoCLaaS (opt-in, human-run)', () => {
  let system; let taA; let db; let providerCalls = 0;
  const OPEN_IDS = ['live-open-1', 'live-open-2', 'live-open-3'];
  const DRAFT_ID = 'live-claimed-1';
  const INJ_ID = 'live-inject-1';
  const ALL_IDS = [...OPEN_IDS, DRAFT_ID, INJ_ID];

  if (live) {
    beforeAll(() => {
      db = makeStubDb();
      const gateway = createAiGateway({ env: process.env, db });
      registerTaAiFeatures(gateway);
      system = buildAiSystem(gateway);
      ({ taA } = system.standardCast());
      const mk = (i, over) => makeTicket(over.id, {
        createdAt: new Date(T0 + i * 1000), updatedAt: new Date(T0 + i * 1000), ...over.fields,
      });
      [
        { id: OPEN_IDS[0], fields: { title: 'Off-by-one in loop', errorOutput: 'IndexError: list index out of range' } },
        { id: OPEN_IDS[1], fields: { title: 'Index error on last item', errorOutput: 'IndexError: list index out of range' } },
        { id: OPEN_IDS[2], fields: { title: 'Recursion never ends', errorOutput: 'RecursionError: maximum recursion depth exceeded', conceptTags: ['recursion'] } },
        { id: DRAFT_ID, fields: { title: 'Loop crashes at end', status: 'CLAIMED', claimedByTaId: IDS.taA } },
        { id: INJ_ID, fields: { title: 'Odd request', status: 'CLAIMED', claimedByTaId: IDS.taA, actualBehaviour: INJECTION, attempted: INJECTION } },
      ].forEach((spec, i) => system.ticketStore.seedTicket(mk(i + 1, spec)));
    });
  }

  const post = (url) => withAuth(request(system.app).post(url), taA).send({});
  const snapshotAll = () => Promise.all(ALL_IDS.map((id) => snapshot(system.ticketStore, id)));

  liveTest('draft for a CLAIMED ticket: 200, bounded draft, store unchanged, one aiUsage write', async () => {
    const before = await snapshotAll();
    const usageBefore = db.usageWrites.length;
    const res = await post(`/api/ta/tickets/${DRAFT_ID}/fix-note-draft`);
    providerCalls += 1;
    expect(res.status).toBe(200);
    expect(typeof res.body.draft).toBe('string');
    expect(res.body.draft.trim().length).toBeGreaterThan(0);
    expect(res.body.draft.length).toBeLessThanOrEqual(2000);
    expect(await snapshotAll()).toEqual(before);
    expect(db.usageWrites.length - usageBefore).toBe(1);
  }, TIMEOUT_MS);

  liveTest('insights over seeded active tickets: 200, 0-8 groups, seeded ids only, store unchanged', async () => {
    const before = await snapshotAll();
    const usageBefore = db.usageWrites.length;
    const res = await post('/api/ta/tickets/insights');
    providerCalls += 1;
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBeLessThanOrEqual(8);
    for (const g of res.body.groups) {
      for (const t of g.tickets) expect(ALL_IDS).toContain(t.ticketId);
    }
    expect(await snapshotAll()).toEqual(before);
    expect(db.usageWrites.length - usageBefore).toBe(1);
  }, TIMEOUT_MS);

  liveTest('prompt-injection ticket: schema-valid 200 or 502 AI_INVALID_OUTPUT; status and claim unchanged', async () => {
    const before = await snapshotAll();
    const usageBefore = db.usageWrites.length;
    const res = await post(`/api/ta/tickets/${INJ_ID}/fix-note-draft`);
    providerCalls += 1;
    expect([200, 502]).toContain(res.status);
    if (res.status === 200) {
      expect(typeof res.body.draft).toBe('string');
      expect(res.body.draft.length).toBeLessThanOrEqual(2000);
      expect(db.usageWrites.length - usageBefore).toBe(1);
    } else {
      expect(res.body.code).toBe('AI_INVALID_OUTPUT');
    }
    expect(await snapshotAll()).toEqual(before);
    const after = await system.ticketStore.getTicket(INJ_ID);
    expect(after.status).toBe('CLAIMED');
    expect(after.claimedByTaId).toBe(IDS.taA);
  }, TIMEOUT_MS);

  liveTest('stays within the provider-call budget', () => {
    expect(providerCalls).toBeLessThanOrEqual(4);
  });

  // Keeps the suite from being reported as empty when the gate is closed.
  if (!live) test.skip('live SoCLaaS tests are skipped (set RUN_SOCLAAS_TESTS=1 with SOCLAAS_* in .env)', () => {});
});
