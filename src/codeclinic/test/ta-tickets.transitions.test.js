// T01 (spec C1, C2; scenarios 3-6): constants and the pure transition guard.
// Assumed interfaces are listed in workflow/tasks/ta-ticket-queue/test-coverage-report.md.
const constants = require('../server/tickets/constants');
const { evaluateTransition } = require('../server/tickets/transitions');

const STATUSES = ['OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED'];
const OWNER = 'student-owner';
const TA_A = 'ta-a';
const TA_B = 'ta-b';

const taA = { userId: TA_A, accountType: 'TA' };
const taB = { userId: TA_B, accountType: 'TA' };
const owner = { userId: OWNER, accountType: 'STUDENT' };
const otherStudent = { userId: 'student-other', accountType: 'STUDENT' };

function decide(event, status, actor, claimedByTaId = null) {
  return evaluateTransition({ event, status, claimedByTaId, actor, studentId: OWNER });
}

describe('shared ticket constants (C1, Q1)', () => {
  test('exports the four statuses and the Q1 language list exactly', () => {
    expect([...constants.STATUSES].sort()).toEqual([...STATUSES].sort());
    expect([...constants.LANGUAGES]).toEqual(['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other']);
  });

  test('exports the page size, reply cap, and length caps from the spec', () => {
    expect(constants.PAGE_SIZE).toBe(20);
    expect(constants.MAX_REPLIES).toBe(200);
    expect(constants.MAX_REPLY_LENGTH).toBe(4000);
    expect(constants.MAX_FIX_NOTE_LENGTH).toBe(2000);
    expect(constants.MAX_CONCEPT_TAGS).toBe(5);
    expect(constants.MAX_TAG_LENGTH).toBe(30);
  });

  test('constants are frozen so callers cannot widen them', () => {
    expect(Object.isFrozen(constants.STATUSES)).toBe(true);
    expect(Object.isFrozen(constants.LANGUAGES)).toBe(true);
  });

  test.each([
    [[], true],
    [['loops'], true],
    [['a', 'b', 'c', 'd', 'e'], true],
    [['a', 'b', 'c', 'd', 'e', 'f'], false],
    [['x'.repeat(30)], true],
    [['x'.repeat(31)], false],
    [[''], false],
    [[' loops'], false],
    [['Loops'], false],
    [['loops', 5], false],
    ['loops', false],
    [null, false],
  ])('isValidConceptTags(%j) is %s (0-5 lowercase trimmed tags of 1-30 chars)', (tags, expected) => {
    expect(constants.isValidConceptTags(tags)).toBe(expected);
  });
});

describe('transition guard: claim (R3)', () => {
  test.each(STATUSES)('a TA claiming a %s ticket', (status) => {
    const result = decide('claim', status, taA);
    if (status === 'OPEN') expect(result).toEqual({ allowed: true, to: 'CLAIMED' });
    else expect(result.allowed).toBe(false);
  });

  test('a student can never claim', () => {
    STATUSES.forEach((status) => {
      expect(decide('claim', status, owner).allowed).toBe(false);
      expect(decide('claim', status, otherStudent).allowed).toBe(false);
    });
  });

  test('a CLAIMED ticket cannot be claimed by anyone, including the claimer', () => {
    expect(decide('claim', 'CLAIMED', taA, TA_A).allowed).toBe(false);
    expect(decide('claim', 'CLAIMED', taB, TA_A).allowed).toBe(false);
  });
});

describe.each([['unclaim', 'OPEN'], ['resolve', 'RESOLVED']])('transition guard: %s (R4, R6)', (event, target) => {
  test.each(STATUSES)(`the claiming TA on a %s ticket`, (status) => {
    const result = decide(event, status, taA, status === 'CLAIMED' ? TA_A : null);
    if (status === 'CLAIMED') expect(result).toEqual({ allowed: true, to: target });
    else expect(result.allowed).toBe(false);
  });

  test('another TA cannot act on a ticket claimed by TA A (scenario 4)', () => {
    expect(decide(event, 'CLAIMED', taB, TA_A).allowed).toBe(false);
  });

  test('a student cannot act, even the owner', () => {
    expect(decide(event, 'CLAIMED', owner, TA_A).allowed).toBe(false);
    expect(decide(event, 'CLAIMED', otherStudent, TA_A).allowed).toBe(false);
  });

  test('a CLAIMED ticket with a missing claimer is never actionable', () => {
    expect(decide(event, 'CLAIMED', taA, null).allowed).toBe(false);
    expect(decide(event, 'CLAIMED', taA, undefined).allowed).toBe(false);
  });
});

describe('transition guard: close (student-tickets owns it; the table must still hold)', () => {
  test.each(STATUSES)('the owning student closing a %s ticket', (status) => {
    const result = decide('close', status, owner, status === 'CLAIMED' ? TA_A : null);
    if (status === 'OPEN' || status === 'CLAIMED') expect(result).toEqual({ allowed: true, to: 'CLOSED' });
    else expect(result.allowed).toBe(false);
  });

  test('a TA or a non-owning student cannot close', () => {
    expect(decide('close', 'OPEN', taA).allowed).toBe(false);
    expect(decide('close', 'CLAIMED', taA, TA_A).allowed).toBe(false);
    expect(decide('close', 'OPEN', otherStudent).allowed).toBe(false);
  });
});

describe('transition guard: reply (R5, Q2)', () => {
  test.each(STATUSES)('a TA replying on a %s ticket (scenario 5)', (status) => {
    const result = decide('reply', status, taB, status === 'CLAIMED' ? TA_A : null);
    if (status === 'OPEN' || status === 'CLAIMED') expect(result).toEqual({ allowed: true, to: status });
    else expect(result.allowed).toBe(false);
  });
});

describe('transition guard: terminal states and unknown input', () => {
  const events = ['claim', 'unclaim', 'resolve', 'close', 'reply'];

  test.each(['RESOLVED', 'CLOSED'])('%s is terminal for every event and actor', (status) => {
    events.forEach((event) => {
      [taA, taB, owner, otherStudent].forEach((actor) => {
        expect(decide(event, status, actor, TA_A).allowed).toBe(false);
      });
    });
  });

  test('an unknown event, status, or missing actor is refused', () => {
    expect(decide('reopen', 'OPEN', taA).allowed).toBe(false);
    expect(decide('claim', 'ARCHIVED', taA).allowed).toBe(false);
    expect(decide('claim', 'OPEN', null).allowed).toBe(false);
    expect(decide('claim', 'OPEN', { userId: TA_A, accountType: 'ADMIN' }).allowed).toBe(false);
    expect(evaluateTransition({})).toEqual({ allowed: false });
  });

  test('the guard does not mutate its input', () => {
    const input = Object.freeze({ event: 'claim', status: 'OPEN', claimedByTaId: null, actor: Object.freeze({ ...taA }), studentId: OWNER });
    expect(() => evaluateTransition(input)).not.toThrow();
  });
});
