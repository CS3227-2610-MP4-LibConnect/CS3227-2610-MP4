# Batch 2 review execution log

Date: 2026-11-10 (Asia/Singapore)
Reviewer: `ticket_review_batch2`
Snapshot: `C:/Users/Junho/AppData/Local/Temp/student-my-tickets-batch2-checkout`

## Scope and files inspected

Verified the approved spec/checklist/handoff v0.1, Batch 2 plan and approval, `assignment-batch-2.json`, current state, Batch 1 report and T01 re-review, and T03/T04 implementation reports and implementation logs in the original workspace. Compared the exact clone diff and untracked inventory. Inspected My Tickets page and CSS, shared card, route guard, focused Student tests, synthetic emulator test, guide edits, and combined Batch 1 API/store/index changes relevant to the integrated list. The clone diff contains Batch 1 API/index/card/nav work plus Batch 2 UI/tests/emulator/docs and task evidence; no dependency, lockfile, deployment configuration, or unrelated production change was found. The original workspace's unrelated validator mutation and line-ending-only TA test status were not part of this review snapshot.

Snapshot tracked diff paths: `docs/DeveloperGuide.md`, `docs/UserGuide.md`, `src/codeclinic/firestore.indexes.json`, `src/codeclinic/server/tickets/route.js`, `src/codeclinic/server/tickets/store.js`, `src/codeclinic/server/tickets/validation.js`, `src/codeclinic/src/AppHeader.tsx`, `src/codeclinic/src/StudentDashboard.tsx`, `src/codeclinic/src/tickets/MyTicketsPage.tsx`, `src/codeclinic/test/StudentTicketActivity.test.tsx`, and `src/codeclinic/test/student-ticket-activity.emulator.test.js`. Snapshot untracked paths: `src/codeclinic/server/tickets/list-cursor.js`, `src/codeclinic/src/tickets/MyTicketsPage.css`, `src/codeclinic/src/tickets/StudentTicketCard.css`, `src/codeclinic/src/tickets/StudentTicketCard.tsx`, `src/codeclinic/test/StudentMyTickets.test.tsx`, `src/codeclinic/test/StudentTicketCard.test.tsx`, `src/codeclinic/test/student-my-tickets.contract.test.js`, and task evidence under `workflow/tasks/student-my-tickets/` and `logs/tasks/student-my-tickets/`.

## Reviewer commands and results

1. Inspected package scripts with `Get-Content package.json`. The test script uses Jest; the selected command below runs only Student list, guard/card, API contract, and Student emulator suites. No TA queue/TA AI suites were selected.

2. In PowerShell, set the local emulator variables and ran from `src/codeclinic`:

   ```powershell
   $env:RUN_FIRESTORE_EMULATOR_TESTS='1'; $env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'; $env:CODECLINIC_FIRESTORE_MODE='local-emulator'; $env:CODECLINIC_FIRESTORE_PROJECT_ID='demo-codeclinic'; npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js test/student-ticket-activity.emulator.test.js
   ```

   **Result: pass**, 6 suites and 60 tests. The emulator flow passed using the local emulator at `127.0.0.1:8080`. Jest emitted the existing Node `punycode` deprecation and React `act(...)` console warnings; no assertions failed.

3. Ran from `src/codeclinic`:

   ```powershell
   npm run build
   ```

   **Result: pass**, optimized production build compiled successfully. Node emitted the `fs.F_OK` deprecation warning.

4. Ran from the clone root:

   ```powershell
   git diff --check
   ```

   **Result: pass**, no whitespace errors. Git printed line-ending conversion notices for modified LF files.

5. Searched the updated guides for the required My Tickets behavior and index details. **Result: present**: the User Guide describes Open/Closed status groups, status labels, pagination/retry, and dashboard link; the Developer Guide describes the protected list endpoint, server owner derivation, ordering/cursor, composite index dependency, and emulator coverage.

## Targeted retry and stale-response inspection

- `loadMore` has a synchronous pending-ref guard and sets it before awaiting; the control is disabled during the request. The UI suite passed its duplicate Load more click case.
- Initial Retry synchronously switches the page state to `loading` before its await, which removes the Retry control during the pending request. Additional-page Retry reuses `loadMore` and its pending guard. No separate repeated-initial-Retry test exists; the rendered state transition was verified by source inspection.
- View switches increment the generation and clear results/cursor before fetching. The stale Open response test passed and confirmed it does not replace Closed results.

## Findings and unverified criteria

- T03: no production finding. Direct-route tests cover unauthorized visitor/TA access before list fetch; server API validation and owner scoping are covered by focused contract tests. Keyboard selected state, retry paths, malformed response behavior, and stale-response behavior are covered by the focused UI tests.
- T04: no production finding. Emulator tests cover two-Student isolation, all four statuses, tied timestamps, and two-page Open/Closed boundaries. Guides contain the delivered list and dependency documentation.
- Human rendered check at 320 CSS pixels is **unverified**: no human observation or screenshot was supplied. Required checks remain direct route/refresh as Student, toggle and keyboard access, no horizontal overflow, terminal text/link readability, and visible focus.
- Production Firestore index deployment is unverified and was not authorized; local emulator evidence does not establish production deployment.
- The implementation report's earlier broad run records 77 suites passed, 1 failed, 6 skipped; the sole failure was unrelated `test/ta-tickets.indexes.test.js` with TA queue index assumptions. This reviewer did not rerun TA suites, per the user's scope steering.

Runtime-provided input/output/total token metrics: unavailable. No production files were added by this review. The follow-up review-only test is isolated to the temporary clone as documented below.

## Follow-up: initial Retry duplicate-request check

At the orchestrator's request, added `test/review-initial-retry.test.tsx` only to the separate temporary clone. This file is a review-only artifact and is not present in the original workspace or implementation diff. It first makes the initial list request return a synthetic 503, then dispatches two clicks on the visible Retry button within one React `act`, before React commits the loading state. The test asserts that the two clicks produce only one additional list request.

Exact command, run from `src/codeclinic` in the temporary clone:

```powershell
npm test -- --watchAll=false --runInBand --runTestsByPath test/review-initial-retry.test.tsx
```

**Result: expected regression check failed**, 1 suite and 1 test failed. The initial request count was 1; the test observed 2 additional requests after the two Retry clicks, for a total of 3. Jest's assertion reported `Expected: 1; Received: 2`. This is a reproduced Low-severity T03 finding: initial retry lacks a synchronous pending guard. Recommended action: add a synchronous guard for initial load/retry and retain a regression test that dispatches duplicate clicks before React commits state.

The T03 verdict is updated from pass with follow-up to **changes required**. T04 remains pass with follow-up; the required human 320 CSS-pixel rendered check remains open.

## Approved T03 correction re-review and T04 reconciliation

Approval and evidence re-read: specification v0.1, checklist v0.1, handoff v0.1, approved `approval-batch-2-correction.md`, T03 implementation report and correction log addendum, and `verification-T04-human.md`.

Copied only the implementer's corrected `MyTicketsPage.tsx` and `StudentMyTickets.test.tsx` from the original workspace into the separate clean clone. SHA-256 parity:

- `src/codeclinic/src/tickets/MyTicketsPage.tsx`: original and clone both `9BD1FB55AB9AAA34841B9D6BE46737A9C205AFAAFD4595FF9DC85FE0F72A8452`.
- `src/codeclinic/test/StudentMyTickets.test.tsx`: original and clone both `65C5E548D3BDC8090BDE2914E7776995BFBC114FFC0E3A3BF87F55FCBD3B3502`.

Reviewed the synchronous guard: `initialPendingGeneration` is set before the state update/request; a same-generation duplicate returns; `finally` clears only its own generation. A new view generation remains free to start while an old request is stale. The implementation regression test dispatches two Retry clicks within one React batch and asserts the list request count remains two total (one initial failure plus one retry).

Ran from `src/codeclinic` in the clone:

```powershell
npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js test/review-initial-retry.test.tsx
```

**Result: pass**, 6 suites and 61 tests. This includes the implementation regression and the clone-only review repro, both confirming that two same-batch Retry clicks start only one additional request. Existing Node `punycode` and React `act(...)` console warnings appeared; assertions passed. No TA queue/TA AI suite ran.

Ran from `src/codeclinic` in the clone:

```powershell
npm run build
```

**Result: pass**, optimized production build compiled successfully. Node emitted the existing `fs.F_OK` deprecation warning.

T03 verdict is updated from **changes required** to **pass**; the low-severity duplicate Retry finding is resolved by the approved correction and passing test. T04 is now **pass by human report** based on `workflow/tasks/student-my-tickets/verification-T04-human.md`, which records the human's confirmation of all required functionality at `/student/tickets`, 320 × 800 CSS pixels. I did not independently observe the browser. The evidence does not say separately whether Retry was triggerable during the rendered check; automated retry/keyboard checks remain documented. Combined Batch 2 verdict is **pass**. Production index deployment remains outside scope and unverified. The human verification record supersedes the earlier statement that the 320-pixel check was pending.

The corrected review-only retry test remains only at `test/review-initial-retry.test.tsx` in the separate temporary clone; it is not in the original workspace or implementation diff. No production files, implementation tests, source checklist, or TA files were edited by this review.
