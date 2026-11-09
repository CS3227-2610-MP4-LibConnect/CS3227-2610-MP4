// Improvement round 1 (T15, T16): shared message constants and the insights invalid-output text.
const { makeStubGateway, buildAiSystem, makeTicket, withAuth } = require('./helpers/ta-ai-harness');
const request = require('supertest');
const { toAiErrorResponse, requireEmptyJsonBody } = require('../server/tickets/ta-ai-shared');
const { INVALID_MESSAGE, CONFLICT_MESSAGE } = require('../server/tickets/constants');

const ID = 'tk-msg-1';
const gateway = () => makeStubGateway(async () => ({ ok: true, data: { draft: 'x' } }));

describe('T15: AI_INVALID_OUTPUT texts', () => {
  test('insights text is the short form', () => {
    const r = toAiErrorResponse('AI_INVALID_OUTPUT', 'QUEUE_INSIGHTS');
    expect(r.status).toBe(502);
    expect(r.body).toEqual({ code: 'AI_INVALID_OUTPUT', message: 'The AI reply could not be used. Please try again.' });
  });

  test('drafter text is unchanged', () => {
    const r = toAiErrorResponse('AI_INVALID_OUTPUT', 'FIX_NOTE_DRAFTER');
    expect(r.body.message).toBe('The AI reply could not be used. Please try again or write the note yourself.');
  });
});

describe('T16: shared message constants', () => {
  test('constants hold the router and claim texts', () => {
    expect(INVALID_MESSAGE).toBe('Enter valid details.');
    expect(CONFLICT_MESSAGE).toBe('This ticket can no longer be changed that way. Refresh and try again.');
  });

  test('requireEmptyJsonBody answers 400 with the router invalid text', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireEmptyJsonBody({ body: { a: 1 }, headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Enter valid details.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireEmptyJsonBody passes an empty body', () => {
    const next = jest.fn();
    requireEmptyJsonBody({ body: {}, headers: {} }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('the draft route 409 uses the claim conflict text and the router 400 matches', async () => {
    const system = buildAiSystem(gateway());
    const { taA } = system.standardCast();
    system.ticketStore.seedTicket(makeTicket(ID, { status: 'OPEN', claimedByTaId: null }));
    const url = `/api/ta/tickets/${ID}/fix-note-draft`;
    const conflict = await withAuth(request(system.app).post(url), taA);
    expect(conflict.status).toBe(409);
    expect(conflict.body).toEqual({ message: CONFLICT_MESSAGE });
    const claim = await withAuth(request(system.app).post(`/api/ta/tickets/${ID}/resolve`), taA).send({ fixNote: 'n' });
    expect(claim.status).toBe(409);
    expect(claim.body.message).toBe(conflict.body.message);
    const bad = await withAuth(request(system.app).post(url), taA).send({ draft: 'inject' });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ message: INVALID_MESSAGE });
  });
});
