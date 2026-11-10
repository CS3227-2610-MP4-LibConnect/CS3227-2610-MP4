// T01 (spec ai-ta-assist R4, R5; scenarios 6, 7, 9): shared helpers in server/tickets/ta-ai-shared.js.
// Assumed exports: toAiErrorResponse(code, feature) -> { status, body: { code, message } };
// buildAliasMap(tickets) -> Map<alias, ticket record with ticketId, title, updatedAt>;
// cleanInsightGroups(groups, aliasMap) -> [{ label, kind, summary, tickets: [{ ticketId, title }] }];
// errorSummary(errorOutput) -> string; requireEmptyJsonBody (Express middleware).
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const express = require('express');
const request = require('supertest');
const { R5 } = require('./helpers/ta-ai-harness');
const shared = require('../server/tickets/ta-ai-shared');

const { toAiErrorResponse, buildAliasMap, cleanInsightGroups, errorSummary, requireEmptyJsonBody } = shared;

describe('toAiErrorResponse (R5 table)', () => {
  const cases = [];
  Object.entries(R5).forEach(([code, row]) => {
    ['FIX_NOTE_DRAFTER', 'QUEUE_INSIGHTS'].forEach((feature) => cases.push([code, feature, row.status, row[feature]]));
  });

  test.each(cases)('%s for %s maps to status %i and the fixed message', (code, feature, status, message) => {
    expect(toAiErrorResponse(code, feature)).toEqual({ status, body: { code, message } });
  });

  test('returns only status, code, and message (no provider detail)', () => {
    const result = toAiErrorResponse('AI_INVALID_OUTPUT', 'FIX_NOTE_DRAFTER');
    expect(Object.keys(result).sort()).toEqual(['body', 'status']);
    expect(Object.keys(result.body).sort()).toEqual(['code', 'message']);
  });
});

describe('buildAliasMap', () => {
  const tickets = ['tk-a', 'tk-b', 'tk-c'].map((ticketId, i) => ({
    ticketId, title: `Title ${ticketId}`, updatedAt: new Date(1000 + i),
  }));

  test('assigns T1..Tn in the order given and maps back to the tickets', () => {
    const map = buildAliasMap(tickets);
    expect([...map.keys()]).toEqual(['T1', 'T2', 'T3']);
    expect(map.get('T1')).toMatchObject({ ticketId: 'tk-a', title: 'Title tk-a' });
    expect(map.get('T3')).toMatchObject({ ticketId: 'tk-c' });
  });

  test('an empty list gives an empty map and 60 tickets give T1..T60', () => {
    expect(buildAliasMap([]).size).toBe(0);
    const many = Array.from({ length: 60 }, (_, i) => ({ ticketId: `id-${i}`, title: 't', updatedAt: new Date(i) }));
    const map = buildAliasMap(many);
    expect(map.size).toBe(60);
    expect(map.get('T60')).toMatchObject({ ticketId: 'id-59' });
  });
});

describe('cleanInsightGroups (scenario 6)', () => {
  const tickets = ['tk-a', 'tk-b', 'tk-c'].map((ticketId, i) => ({
    ticketId, title: `Title ${ticketId}`, updatedAt: new Date(1000 + i),
  }));
  const group = (label, aliases, extra = {}) => ({ label, kind: 'CONCEPT', summary: `Teach ${label}`, aliases, ...extra });

  test('maps aliases to { ticketId, title } and keeps label, kind, and summary', () => {
    const out = cleanInsightGroups([group('Loops', ['T1', 'T3'], { kind: 'MISCONCEPTION' })], buildAliasMap(tickets));
    expect(out).toEqual([{
      label: 'Loops', kind: 'MISCONCEPTION', summary: 'Teach Loops',
      tickets: [{ ticketId: 'tk-a', title: 'Title tk-a' }, { ticketId: 'tk-c', title: 'Title tk-c' }],
    }]);
  });

  test('drops unknown aliases', () => {
    const out = cleanInsightGroups([group('Loops', ['T1', 'T9', 'T99'])], buildAliasMap(tickets));
    expect(out).toHaveLength(1);
    expect(out[0].tickets).toEqual([{ ticketId: 'tk-a', title: 'Title tk-a' }]);
  });

  test('an alias in two groups stays in the first group only', () => {
    const out = cleanInsightGroups([group('First', ['T1', 'T2']), group('Second', ['T2', 'T3'])], buildAliasMap(tickets));
    expect(out.map((g) => g.tickets.map((t) => t.ticketId))).toEqual([['tk-a', 'tk-b'], ['tk-c']]);
  });

  test('removes groups left empty (all unknown, or all already used)', () => {
    const out = cleanInsightGroups(
      [group('Real', ['T1']), group('Ghost', ['T7']), group('Repeat', ['T1'])],
      buildAliasMap(tickets),
    );
    expect(out.map((g) => g.label)).toEqual(['Real']);
  });

  test('no groups gives no groups; model text cannot add ticket ids', () => {
    expect(cleanInsightGroups([], buildAliasMap(tickets))).toEqual([]);
    const out = cleanInsightGroups([group('Sneaky', ['tk-a', 'T1; DROP', '../T1'])], buildAliasMap(tickets));
    expect(out).toEqual([]);
  });

  test('exposes only ticketId and title for each ticket (no updatedAt or other fields)', () => {
    const out = cleanInsightGroups([group('Loops', ['T1'])], buildAliasMap(tickets));
    expect(Object.keys(out[0].tickets[0]).sort()).toEqual(['ticketId', 'title']);
  });
});

describe('errorSummary', () => {
  test('returns the first non-empty line', () => {
    expect(errorSummary('IndexError: out of range\n  at line 3\nmore')).toBe('IndexError: out of range');
    expect(errorSummary('\n\n   \nTypeError: x is not a function\nstack')).toBe('TypeError: x is not a function');
  });

  test('caps the summary at 160 characters', () => {
    const long = 'E'.repeat(500);
    expect(errorSummary(long)).toHaveLength(160);
    expect(errorSummary('F'.repeat(160))).toHaveLength(160);
    expect(errorSummary('G'.repeat(159))).toHaveLength(159);
  });

  test('returns an empty string for empty, whitespace-only, null, or non-string input', () => {
    ['', '   \n \n', null, undefined, 42].forEach((value) => expect(errorSummary(value)).toBe(''));
  });
});

describe('requireEmptyJsonBody (scenario 9)', () => {
  const app = express();
  app.use(express.json());
  app.post('/x', requireEmptyJsonBody, (req, res) => res.status(200).json({ ok: true }));

  test('allows no body and an empty JSON object', async () => {
    expect((await request(app).post('/x')).status).toBe(200);
    expect((await request(app).post('/x').send({})).status).toBe(200);
  });

  test.each([
    ['a non-empty JSON object', (r) => r.send({ a: 1 })],
    ['text/plain', (r) => r.set('Content-Type', 'text/plain').send('hello')],
    ['form data', (r) => r.set('Content-Type', 'application/x-www-form-urlencoded').send('a=1')],
    ['a JSON array', (r) => r.send([1])],
  ])('rejects %s with 400 and does not continue', async (_name, shape) => {
    const response = await shape(request(app).post('/x'));
    expect(response.status).toBe(400);
    expect(response.body.ok).toBeUndefined();
  });
});
