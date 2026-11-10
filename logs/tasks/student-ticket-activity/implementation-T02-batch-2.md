# Factual execution log: T02 Batch 2

Task: `student-ticket-activity`  
Spec v0.3, checklist v0.2, handoff v0.2  
Date: 2026-11-10 (Asia/Singapore)

## Preflight

- Read `AGENTS.md`, `workflow/agents/implementer.toml`, manifest
  `workflow/tasks/student-ticket-activity/assignment-batch-2.json`, its
  approval record, current state, Batch 1 review, v0.3 coverage addendum,
  approved spec/checklist/handoff and their approval evidence.
- Verified the manifest assigns only T02 and allows the three ticket server
  files, three focused test files, this report and this log. Preserved the
  existing `StudentDashboard.tsx` edit.
- `openspec list --json` — exited 0; returned root
  `C:\Users\Junho\Desktop\NUS_MODS\CS3227\CS3227-2610-MP4` and
  `changes: []`. Per repository adapter instructions, used the canonical
  approved artifacts under `workflow/specs/` and `workflow/tasks/`; did not
  create an OpenSpec root or alter planning artifacts.
- Firestore target is the previously approved Standard edition database;
  this batch did not access an external service.

## Checks

Working directory for npm commands:
`src/codeclinic`.

1. `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js test/student-tickets.api.test.js test/student-tickets.storage.test.js`

   Result after implementation: **2 suites passed, 1 suite failed; 2 tests
   failed, 62 passed (64 total).** The API and storage suites passed. The two
   failures are the existing `reply requires CSRF and accepts only a bounded
   message field` and `close requires CSRF and returns a conflict for a
   terminal-state ticket` assertions in the activity contract suite. They
   receive 404 because the T03 reply/close endpoints are not implemented in
   this T02-only batch.

2. `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js --testNamePattern="active ticket|detail read|missing owner|returns a cursor"`

   Result: **1 suite passed; 7 tests passed, 5 skipped.** Covered T02 route
   ownership/auth, safe response, literal text, missing owner author fallback,
   cursor presence and bounded author lookup concurrency. Jest's pattern also
   selected the unrelated active-ticket contract tests.

The earlier development run also exposed a storage test assertion using the
wrong operation-log shape and a test fixture that did not simulate the owner
account disappearing between authentication and author resolution. Both test
fixtures/assertions were corrected; the final outcomes above are authoritative.

## T02-specific evidence

- API suite passed the encoded-slash ticket ID and malformed cursor safe-400
  cases with `Cache-Control: no-store`.
- Storage suite passed the first-block limit/order, continuation boundary, and
  separate `limit(1)` “another page exists” probe checks. The query limit is 50;
  the probe limit is 1.
- Route-level contract test measured concurrent author repository lookups and
  observed a maximum no greater than five across 50 replies.
- Final-page contract verifies absence of `nextCursor`; full-page contract
  verifies a cursor is returned when another page exists.

No production Firestore, secrets, or personal data were accessed. No UI,
checklist, approval record, or reviewer artifact was changed.
