# Implementation report: T05 Emulator integration tests

Spec: `workflow/specs/ta-ticket-queue.md` v0.1 (approved). Handoff v0.1 permits the local Firestore emulator for T05. Branch `ta-ticket-queue-t05`, base `1d8ff71`.

Changed: `src/codeclinic/test/ta-ticket-queue-emulator.integration.test.js` (additive only, below). No `store.js` or other production change.

Test-file changes (both additive, wiring only; no assertion weakened):
1. After `persistence.createAccount`, a TA user doc is set to `accountStatus: 'ACTIVE'` directly. Registered TAs start `INACTIVE` and login returns 401 otherwise; `account-emulator.integration.test.js` activates TAs the same way.
2. Added `step = 'sign in'` label so failures are reported at the right step.

Verification (emulator project `demo-codeclinic`, no real credentials):
```
CI=true RUN_FIRESTORE_EMULATOR_TESTS=1 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 CODECLINIC_FIRESTORE_MODE=local-emulator CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic \
firebase emulators:exec --only firestore --project demo-codeclinic "npm test -- --watch=false --runInBand --runTestsByPath test/ta-ticket-queue-emulator.integration.test.js"
```
- Before change 1: FAIL at login (401). After: PASS (1/1), covering filters (status/language/concept), concurrent claim race (200 + 409), and TICKET_CLAIMED/TICKET_REPLY/TICKET_RESOLVED notifications, late reply 409.
- Non-emulator suite: gated test skipped cleanly. 41 suites passed, 2 failed (TAQueuePage route-regex test and one other; both are T07 routes, unrelated to T05); 955 passed, 1 failed, 4 skipped.
- Emulator exited by `emulators:exec`; no process left running.

Store defects found: none.
Risks: the emulator does not enforce composite indexes; production Firestore may need an index for the status/language/concept ordered queries (no `firestore.indexes.json` was inspected or changed).
