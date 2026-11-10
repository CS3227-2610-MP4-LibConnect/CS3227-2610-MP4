# T01 server-wiring correction execution log

Date: 2026-11-09 (Asia/Singapore)  
Specification: `student-tickets` v0.3; checklist v0.2; handoff v0.2

## Pre-fix reproduction

Command from `src/codeclinic`:

```text
npm test -- --runInBand --watchAll=false --silent registration.api.test registration.endpoint.test student-tickets.api.test
```

Observed: registration API and endpoint suites failed with 503 responses (68
failed tests); ticket API suite passed (47 tests). This reproduced the
registration regression documented in `t04-verification-pre-dispatch.md`.

## Post-fix verification

Command from `src/codeclinic`:

```text
npm test -- --runInBand --watchAll=false --verbose registration.api.test registration.endpoint.test student-tickets.api.test server.test
```

Exit code 0. 5 suites passed; 125 tests passed. This includes malformed and
over-8 KiB registration body responses (400), registration API success and
failure cases, ticket API authorization/CSRF/validation/storage failure and
malformed/over-128 KiB checks, server composition registration success, and a
server-composition ticket 413 check. Full output is in
`implementation-T01-wiring-run1.log`.

Command from `src/codeclinic`:

```text
npm test -- --runInBand --watchAll=false --verbose student-tickets.storage.test account-r7-server.test
```

Exit code 0. 2 suites passed; 10 tests passed. Confirms ticket storage and the
mounted forced-password-change guard. Full output is in
`implementation-T01-wiring-run2.log`.

Both runs emitted the existing Node `punycode` deprecation warning. No
verification failures remain in the requested focused suites.

## Re-review response: T01-W1

Finding received: `workflow/tasks/student-tickets/review-T01-wiring.md`
identified that the guard preceded registration parsing and could return 403
for malformed JSON with a forced-password session.

The registration route order is now 8 KiB strict JSON parser, forced-password
guard, registration handler, route-local safe error handler. The server test
asserts that a valid request from a synthetic forced-password session returns
403, malformed JSON from that same session returns safe 400, and no additional
account is persisted. It also retains the ticket over-128 KiB 413 assertion.

Command from `src/codeclinic`:

```text
npm test -- --runInBand --watchAll=false --verbose registration.api.test registration.endpoint.test student-tickets.api.test student-tickets.storage.test account-r7-server.test server.test
```

Exit code 0. 6 suites passed; 126 tests passed. This covers both registration
suites, the new combined guard/parser case, existing R7 guard behavior, ticket
API and storage behavior, and the ticket 128 KiB boundary. Full output is in
`implementation-T01-wiring-run3.log`. The existing `punycode` deprecation
warning was emitted; no test failures occurred.
