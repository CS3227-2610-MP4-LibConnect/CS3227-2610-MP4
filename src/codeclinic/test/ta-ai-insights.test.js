// T03 (spec ai-ta-assist R3, R4 cache; scenarios 5, 8): the QUEUE_INSIGHTS definition and the
// cache in server/tickets/ta-ai-insights.js.
// Assumed exports: QUEUE_INSIGHTS (definition) and createInsightsCache({ now, ttlMs }) returning
// { keyFor(aliasMap), get(key), set(key, data) }; get returns a falsy value on a miss or expiry.
// Assumed buildUserContent input: { tickets: [{ alias, language, conceptTags, title, errorOutput, ...other }] }.
const { validateFeatureDefinition } = require('../server/ai/features');
const { buildAliasMap } = require('../server/tickets/ta-ai-shared');
const { QUEUE_INSIGHTS: definition, createInsightsCache } = require('../server/tickets/ta-ai-insights');

const ticket = (n, over = {}) => ({
  alias: `T${n}`,
  ticketId: `tk-secret-${n}`,
  studentId: 'user-stu-9f3',
  claimedByTaId: 'user-ta-a-77c',
  title: `Title number ${n}`,
  language: 'Python',
  conceptTags: ['loops', 'recursion'],
  errorOutput: `IndexError: line ${n}\n  at secret_frame_${n}\nmore`,
  files: [{ name: 'secret_file.py', content: 'SECRET-CODE-BODY' }],
  repoUrl: 'https://github.com/secret-org/secret-repo',
  expectedBehaviour: 'SECRET-EXPECTED',
  actualBehaviour: 'SECRET-ACTUAL',
  attempted: 'SECRET-ATTEMPT',
  replies: [{ message: 'SECRET-REPLY', authorRole: 'STUDENT' }],
  studentName: 'Sam Student',
  ...over,
});

describe('QUEUE_INSIGHTS definition (R3)', () => {
  test('is a valid gateway feature definition with the specified caps', () => {
    expect(validateFeatureDefinition(definition)).toEqual({ ok: true });
    expect(definition.feature).toBe('QUEUE_INSIGHTS');
    expect(definition.maxInputChars).toBe(12000);
    expect(definition.maxOutputTokens).toBe(1200);
  });

  test('has a fixed system prompt naming the group fields, kinds, and the alias rules', () => {
    const prompt = definition.systemPrompt;
    ['label', 'kind', 'CONCEPT', 'MISCONCEPTION', 'summary', 'aliases'].forEach((word) => expect(prompt).toContain(word));
    expect(prompt).toMatch(/only (the )?listed aliases|only .*listed/i);
    expect(prompt).toMatch(/at most one group|one group/i);
  });
});

describe('QUEUE_INSIGHTS buildUserContent (scenario 5)', () => {
  const build = (tickets) => definition.buildUserContent({ tickets });
  const lines = (tickets) => build(tickets).split('\n').filter((line) => line.trim() !== '');

  test('writes one line per ticket as alias | language | tags | title | error summary', () => {
    const out = lines([ticket(1), ticket(2, { language: 'Java', title: 'Other title' })]);
    expect(out).toHaveLength(2);
    const fields = out[0].split(' | ');
    expect(fields).toHaveLength(5);
    expect(fields[0]).toBe('T1');
    expect(fields[1]).toBe('Python');
    expect(fields[2]).toContain('loops');
    expect(fields[2]).toContain('recursion');
    expect(fields[3]).toBe('Title number 1');
    expect(fields[4]).toBe('IndexError: line 1');
    expect(out[1].split(' | ').slice(0, 2)).toEqual(['T2', 'Java']);
  });

  test('the error summary is the first non-empty line capped at 160 characters', () => {
    const out = lines([
      ticket(1, { errorOutput: '\n\n  TypeError: first real line\nsecond' }),
      ticket(2, { errorOutput: 'X'.repeat(400) }),
    ]);
    expect(out[0].split(' | ')[4]).toBe('TypeError: first real line');
    expect(out[1].split(' | ')[4]).toBe('X'.repeat(160));
  });

  test('sends nothing but those fields: no code, replies, behaviours, IDs, names, or repoUrl', () => {
    const text = build([ticket(1), ticket(2)]);
    [
      'SECRET-CODE-BODY', 'secret_file.py', 'SECRET-REPLY', 'SECRET-EXPECTED', 'SECRET-ACTUAL', 'SECRET-ATTEMPT',
      'tk-secret-1', 'tk-secret-2', 'user-stu-9f3', 'user-ta-a-77c', 'Sam Student', 'secret-repo', 'secret_frame_1',
    ].forEach((value) => expect(text).not.toContain(value));
  });

  test('handles 60 tickets as 60 lines in alias order', () => {
    const out = lines(Array.from({ length: 60 }, (_, i) => ticket(i + 1)));
    expect(out).toHaveLength(60);
    expect(out[0].startsWith('T1 | ')).toBe(true);
    expect(out[59].startsWith('T60 | ')).toBe(true);
  });

  test('a ticket with no tags or no error output still gives one line', () => {
    const out = lines([ticket(1, { conceptTags: [], errorOutput: '' })]);
    expect(out).toHaveLength(1);
    expect(out[0].startsWith('T1 | Python | ')).toBe(true);
  });
});

describe('QUEUE_INSIGHTS parse (R3)', () => {
  const group = (over = {}) => ({ label: 'Off-by-one', kind: 'MISCONCEPTION', summary: 'Re-teach range bounds.', aliases: ['T1', 'T2'], ...over });
  const accepted = (value) => expect(definition.parse(value)).toEqual({ ok: true, data: value });
  const rejected = (value) => expect(definition.parse(value).ok).toBe(false);

  test('accepts 0 to 8 groups', () => {
    accepted({ groups: [] });
    accepted({ groups: [group()] });
    accepted({ groups: Array.from({ length: 8 }, (_, i) => group({ label: `G${i}`, aliases: [`T${i + 1}`] })) });
    rejected({ groups: Array.from({ length: 9 }, (_, i) => group({ label: `G${i}`, aliases: [`T${i + 1}`] })) });
  });

  test('label is 1-60 characters', () => {
    accepted({ groups: [group({ label: 'a' })] });
    accepted({ groups: [group({ label: 'a'.repeat(60) })] });
    rejected({ groups: [group({ label: 'a'.repeat(61) })] });
    rejected({ groups: [group({ label: '' })] });
    rejected({ groups: [group({ label: 5 })] });
  });

  test('kind is CONCEPT or MISCONCEPTION only', () => {
    accepted({ groups: [group({ kind: 'CONCEPT' })] });
    accepted({ groups: [group({ kind: 'MISCONCEPTION' })] });
    ['concept', 'OTHER', '', null, 1].forEach((kind) => rejected({ groups: [group({ kind })] }));
  });

  test('summary is 1-300 characters', () => {
    accepted({ groups: [group({ summary: 's' })] });
    accepted({ groups: [group({ summary: 's'.repeat(300) })] });
    rejected({ groups: [group({ summary: 's'.repeat(301) })] });
    rejected({ groups: [group({ summary: '' })] });
    rejected({ groups: [group({ summary: ['x'] })] });
  });

  test('aliases is a non-empty array of strings matching ^T[0-9]{1,3}$', () => {
    accepted({ groups: [group({ aliases: ['T1'] })] });
    accepted({ groups: [group({ aliases: ['T60', 'T999', 'T0'] })] });
    rejected({ groups: [group({ aliases: [] })] });
    rejected({ groups: [group({ aliases: 'T1' })] });
    ['T', 't1', 'T1000', 'T1a', ' T1', 'T-1', 'tk-secret-1', 1, null, ['T1']].forEach((alias) => rejected({ groups: [group({ aliases: ['T2', alias] })] }));
  });

  test('rejects any other shape', () => {
    [null, undefined, 'groups', [], 7, {}, { groups: null }, { groups: {} }, { groups: [null] }, { groups: ['x'] }, { groups: [[]] }]
      .forEach(rejected);
    rejected({ groups: [], extra: true });
    rejected({ groups: [group({ ticketIds: ['tk-1'] })] });
    rejected({ groups: [{ label: 'x', kind: 'CONCEPT', summary: 'y' }] });
  });

  test('HTML, script, and javascript: text is plain data and is not altered', () => {
    const value = { groups: [group({ label: '<b>x</b>', summary: '<script>alert(1)</script> javascript:alert(1)' })] };
    accepted(value);
  });
});

describe('createInsightsCache (R4 cache; scenario 8)', () => {
  const makeTickets = (updated = [1000, 2000]) => updated.map((ms, i) => ({ ticketId: `tk-${i}`, title: `T ${i}`, updatedAt: new Date(ms) }));
  const keyOf = (cache, tickets) => cache.keyFor(buildAliasMap(tickets));
  const data = { groups: [{ label: 'g', kind: 'CONCEPT', summary: 's', tickets: [{ ticketId: 'tk-0', title: 'T 0' }] }], ticketCount: 2, truncated: false };

  test('the key is stable for the same alias map and updatedAt values', () => {
    const cache = createInsightsCache({ now: () => 0, ttlMs: 300000 });
    expect(keyOf(cache, makeTickets())).toBe(keyOf(cache, makeTickets()));
  });

  test('the key changes when one ticket updatedAt changes, or the ticket set or order changes', () => {
    const cache = createInsightsCache({ now: () => 0, ttlMs: 300000 });
    const base = keyOf(cache, makeTickets());
    expect(keyOf(cache, makeTickets([1000, 2001]))).not.toBe(base);
    expect(keyOf(cache, makeTickets([1000]))).not.toBe(base);
    expect(keyOf(cache, [...makeTickets()].reverse())).not.toBe(base);
    const renamed = makeTickets();
    renamed[0].ticketId = 'tk-other';
    expect(keyOf(cache, renamed)).not.toBe(base);
  });

  test('hit within the TTL, miss for an unknown key, miss after the TTL', () => {
    let clock = 10000;
    const cache = createInsightsCache({ now: () => clock, ttlMs: 300000 });
    const key = keyOf(cache, makeTickets());
    expect(cache.get(key)).toBeFalsy();
    cache.set(key, data);
    expect(cache.get(key)).toEqual(data);
    clock += 299999;
    expect(cache.get(key)).toEqual(data);
    expect(cache.get(keyOf(cache, makeTickets([1, 2])))).toBeFalsy();
    clock += 2;
    expect(cache.get(key)).toBeFalsy();
  });

  test('defaults to a 5-minute TTL', () => {
    let clock = 0;
    const cache = createInsightsCache({ now: () => clock });
    const key = keyOf(cache, makeTickets());
    cache.set(key, data);
    clock = 5 * 60 * 1000 - 1;
    expect(cache.get(key)).toEqual(data);
    clock = 5 * 60 * 1000 + 1;
    expect(cache.get(key)).toBeFalsy();
  });

  test('a changed updatedAt invalidates the old entry (new key misses)', () => {
    const cache = createInsightsCache({ now: () => 0, ttlMs: 300000 });
    cache.set(keyOf(cache, makeTickets()), data);
    expect(cache.get(keyOf(cache, makeTickets([1000, 2500])))).toBeFalsy();
  });

  test('caches are independent per instance', () => {
    const a = createInsightsCache({ now: () => 0, ttlMs: 300000 });
    const b = createInsightsCache({ now: () => 0, ttlMs: 300000 });
    const key = keyOf(a, makeTickets());
    a.set(key, data);
    expect(b.get(key)).toBeFalsy();
  });
});
