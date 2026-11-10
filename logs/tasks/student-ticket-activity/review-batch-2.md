# Independent review execution log: Batch 2 (T02)

Task: `student-ticket-activity`  
Reviewed: specification v0.3, checklist v0.2, handoff v0.2  
Date: 2026-11-10 (Asia/Singapore)

## Review preflight

- Read `AGENTS.md`, `workflow/agents/reviewer.toml`, assignment manifest, Batch 2 approval evidence, current-state index, approved spec/checklist/handoff, Batch 1 review, T02 implementation report and implementation log.
- Confirmed the assignment manifest authorizes review of T02 only and records the shared-workspace exception. Confirmed Batch 2 approval dispatches T02 remediation only; later batch dispatch, deployment, commit, and merge are not approved by that record.
- Compared the scoped source and test diff in `route.js`, `store.js`, `validation.js`, the activity contract test, and API/storage tests. Inspected the ticket creation data contract and existing session/authentication route patterns as relevant base.
- The workspace also contains unrelated/pre-existing edits and Batch 1 files (including AGENTS.md, docs/reflections/junhong.md, dashboard/index configuration, and task artifacts). They were not treated as T02 changes. No production or checklist files were modified by this review.

## Commands and results

Working directory for npm commands: `src/codeclinic`.

1. `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js test/student-tickets.api.test.js test/student-tickets.storage.test.js`

   **2 suites passed, 1 suite failed; 62 passed, 2 failed (64 total).** API and storage suites passed. The only failures are the pre-existing T03 tests `reply requires CSRF and accepts only a bounded message field` and `close requires CSRF and returns a conflict for a terminal-state ticket`; they receive 404 because T03 endpoints are not part of this assignment. No T02 test failed. Jest emitted only the Node `punycode` deprecation warning in addition to the test output.

2. `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js --testNamePattern="active ticket|detail read|missing owner|returns a cursor"`

   **1 suite passed; 7 passed, 5 skipped.** This selection includes the T01 active-query contract and T02 API contracts for ownership hiding, trusted projection/plain-text payload, deleted-owner fallback, cursor presence/final page/author lookup concurrency, denied visitor/TA, plus safe storage failure. The skipped tests are not evidence about their behavior in this run.

## Outcome

The commands were run locally against test fixtures/fakes only. No production Firestore, secrets, or personal data were accessed. Exact independent findings and coverage limits are in `workflow/tasks/student-ticket-activity/review-report-batch-2.md`.
