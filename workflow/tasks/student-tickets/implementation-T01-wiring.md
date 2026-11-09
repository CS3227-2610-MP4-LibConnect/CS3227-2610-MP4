# T01 server-wiring correction implementation report

Task: `student-tickets` T01, scoped wiring correction  
Specification: v0.3; checklist: v0.2; handoff: v0.2  
Status: implementation complete; ready for independent review

## Change

The registration endpoint ran after the nested login app, whose generic error
boundary returned login-service 503 responses for registration failures in the
jsdom integration environment. `server/index.js` now mounts registration
outside that app, with the existing auth 8 KiB parser limit and forced-password
guard retained. Parser errors return the registration API's safe 400 response.
The ticket router remains mounted first and keeps its approved 128 KiB parser
and 413 handling.

Added a server composition regression assertion for successful registration
and for a ticket request above 128 KiB returning 413. Existing registration
suite cases confirm malformed and over-8 KiB registration JSON still return
400; the R7 security suite confirms the forced-password guard behavior.

## Files changed

- `src/codeclinic/server/index.js`
- `src/codeclinic/test/server.test.js`
- `workflow/tasks/student-tickets/implementation-T01-wiring.md`
- `logs/tasks/student-tickets/implementation-T01-wiring.md`

Existing shared-workspace ticket code and route changes were already present;
this correction changes only registration placement and adds wiring coverage.

## Verification

- Registration API, registration endpoint, ticket API, and server composition:
  5 suites passed, 125 tests passed. Full verbose output:
  [`implementation-T01-wiring-run1.log`](../../../logs/tasks/student-tickets/implementation-T01-wiring-run1.log).
- Ticket storage and R7 server guard: 2 suites passed, 10 tests passed. Full
  verbose output:
  [`implementation-T01-wiring-run2.log`](../../../logs/tasks/student-tickets/implementation-T01-wiring-run2.log).
- Exact commands and outcome details are in
  [`implementation-T01-wiring.md`](../../../logs/tasks/student-tickets/implementation-T01-wiring.md).

No specification deviation or unresolved implementation risk identified.
Independent review remains required; Batch 3 remains on hold.

## Follow-up for review finding T01-W1

The first independent review identified that the forced-password guard ran
before the registration JSON parser, returning 403 for malformed JSON from a
forced-password session. The route now parses first, then applies the guard.
The route-local error handler still returns a safe 400 for malformed/oversized
registration JSON, while valid registration requests from a forced-password
session remain blocked with 403. Added a server composition regression check
for both outcomes and for no extra persistence. The ticket router and 128 KiB
boundary are unchanged.

Focused rerun: 6 suites passed, 126 tests passed. Full verbose output is in
[`implementation-T01-wiring-run3.log`](../../../logs/tasks/student-tickets/implementation-T01-wiring-run3.log).
Finding T01-W1 is addressed in source and awaits independent re-review.
