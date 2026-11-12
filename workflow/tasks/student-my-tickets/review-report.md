# Independent review: student-my-tickets Batch 1

Date: 2026-11-10 (Asia/Singapore)
Reviewer: `ticket_review_batch1`
Reviewed artifacts: specification v0.1, checklist v0.1, handoff v0.1, Batch 1 assignment and approval evidence. T01 and T02 remain unchecked in the source checklist.

## Review environment and scope

Reviewed the exact Batch 1 snapshot in `C:/Users/Junho/AppData/Local/Temp/student-my-tickets-batch1-checkout`, a clean local clone with the implementation and task evidence overlaid. A Git worktree could not be used because access to `.git/worktrees` was denied; the clean-clone exception is the compensating control. The clone excludes the unrelated `src/workflow/validate-assignment.mjs` mutation in the original workspace. The clone diff and untracked-file inventory contain the assigned API, index, card, navigation, and focused tests plus task evidence. `StudentDashboard.tsx` contains the user's preexisting **View all tickets** change; it is preserved and was specifically in scope for T02. No dependency, deployment, or unrelated production changes were found.

Reviewed the complete tracked diff and untracked Batch 1 source/tests, especially `src/codeclinic/server/tickets/{route.js,store.js,validation.js,list-cursor.js}`, `src/codeclinic/firestore.indexes.json`, `src/codeclinic/src/{AppHeader.tsx,StudentDashboard.tsx,tickets/StudentTicketCard.tsx,tickets/StudentTicketCard.css}`, and the corresponding API/card/dashboard tests.

## T01 — Owner-scoped paginated ticket-list API

**Verdict: changes required.**

The route sets `Cache-Control: no-store` before processing; validates view/cursor before storage access; authenticates the cookie session; uses the current stored account and session user ID; denies non-Students and password-change accounts; and returns a generic 503 on storage errors. The store scopes the Firestore query by server-derived `studentId`, filters the selected status pair, orders by descending `updatedAt` then ascending `ticketId`, limits reads to 21, projects only the six allowed summary fields, and uses the twentieth result as the next boundary. The cursor is bounded, canonical base64url, structurally checked, and bound to its view. The index definition matches the query fields and ordering. These checks are supported by code inspection and the focused contract tests.

Findings:

- **Medium — required multi-owner isolation test is missing.** The T01 implementation report claims two-Student isolation, but `student-my-tickets.contract.test.js` builds only one account/session at a time. Its owner assertion verifies that `listPage` receives `student-a`; it does not seed two owners and demonstrate that owner B's summaries cannot appear for owner A. Add a synthetic two-owner isolation test as required by T01. The server-derived owner path appears correct by inspection, but the claimed behavior is not independently demonstrated.
- **Low — page-boundary behavior is only partially exercised.** The store contract test supplies 21 already ordered mock docs (all with a same-time value) and checks the query shape and cursor boundary. It does not exercise actual Firestore/emulator ordering and continuation across tied timestamps. The T01 integration evidence can close this in T04; the local fake verifies only the store call contract.

Security and scope: no client-supplied owner is used; unknown `studentId` query data is ignored. Session/current-account checks precede the ticket-store read. Response projection omits code, error output, replies, and owner/account fields. No ticket content or credentials are logged. No live service or index deployment was accessed.

Unverified: actual Firestore/emulator behavior over two owners and tied-time page boundaries; production index deployment (explicitly outside this task); no requirement for deploying it was inferred.

## T02 — Shared ticket card and Student navigation

**Verdict: pass with follow-up.**

`StudentTicketCard` reuses the dashboard's existing card class and content order, emits all four human-readable status labels, uses **No concept tags**, URL-encodes detail IDs, and retains the existing visible focus rule through the shared class. The muted modifier changes the background while keeping the same text and link styles. `AppHeader` adds the Student-only link immediately after Create Ticket and sets `aria-current="page"` for `/student/tickets`; TA links do not include it. The dashboard still has the five-result rendering bound and keeps the user's **View all tickets** wording and destination. Focused tests cover the card, navigation, TA exclusion, and dashboard behavior.

Follow-up: rendered contrast and 320 CSS-pixel overflow/focus checks remain open for T04's required human browser verification. DOM tests do not establish visual contrast or responsive rendering.

## Combined behavior and verification

The API and shared card/navigation changes compose cleanly by inspection: the API returns the summary fields consumed by the card; the card detail path is the existing student ticket route. The guarded My Tickets page itself is not part of Batch 1 implementation and remains the next batch's work.

Inspected package scripts before execution. Ran the two focused commands in the clone; neither starts a service or performs external actions. Exact commands and results are in [review-batch-1.md](../../../logs/tasks/student-my-tickets/review-batch-1.md).

No review-only tests were added. No production files were changed by this review. Runtime-provided model/input/output/total token metrics: unavailable.

## Required handoff to orchestrator

T01 must be returned for correction: add the explicit two-owner isolation test required by the checklist. Keep T01 unchecked until the coverage correction is independently reviewed. The earlier empty-view finding was rechecked and withdrawn: Express `?view=` returns 400, while an omitted `view` defaults to Open. T02 may be recorded as pass with follow-up; retain the T04 human visual check as open. Overall Batch 1 review outcome: **changes required** because T01 lacks required two-owner isolation evidence.

## Recheck of initial finding

The initial empty-view finding was incorrect. `validateTicketListQuery` rejects any supplied string outside `open` and `closed` before applying the omitted-value default. An Express/Supertest check confirmed `GET /?view=` returns 400 with `{"parsed":null}`, while `GET /` returns 200 with `{"parsed":{"view":"open"}}`. No production code changed.

## T01 re-review after approved correction (2026-11-10)

The human-approved corrective test was reviewed in the same clean clone. The source and clone copies of `student-my-tickets.contract.test.js` have matching SHA-256 `232C3B8ED53101AC462FB76C414D18C3304E02A41E8533EFEE6899EAE9C8D70F`. The added fixture creates two active Student accounts, separate valid cookie sessions, and distinct synthetic tickets. The test makes reciprocal forged `studentId` requests, asserts each response contains only that session's ticket, asserts the other ticket ID is absent, and verifies `listPage` receives the respective session-derived owner ID. This is meaningful route-level isolation evidence and resolves the previously missing T01 checklist coverage when considered with the separate store query assertion that Firestore is filtered by `studentId`.

Re-ran `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js` in the clean clone: **pass**, 2 suites and 29 tests. Only the existing Node `punycode` deprecation warning appeared.

**Updated T01 verdict: pass with follow-up.** The original two-owner evidence finding is resolved. Keep T01's T04 integration follow-up open for actual emulator-backed tied-time pagination and the broader synthetic integration flow. Production index deployment remains separately approved. T02 remains **pass with follow-up** for the human rendered 320 CSS-pixel visual check. Updated combined Batch 1 disposition: **pass with follow-up**; the earlier changes-required disposition records the initial review state and is superseded by this re-review.

## Batch 2 independent review (T03, T04)

Date: 2026-11-10 (Asia/Singapore)
Reviewer: `ticket_review_batch2`
Reviewed artifacts: approved specification v0.1, checklist v0.1, handoff v0.1, approved Batch 2 plan/dispatch and manifest, Batch 1 verdict/re-review, T03 and T04 implementation reports and logs.
Exact implementation snapshot: `C:/Users/Junho/AppData/Local/Temp/student-my-tickets-batch2-checkout`, a clean local clone with approved task artifacts overlaid. The original workspace's unrelated validator mutation and line-ending-only TA test state are not in this snapshot.

### T03 — My Tickets views and load states

**Verdict: pass with follow-up.**

The guarded route checks the server session before rendering the page. Direct-route tests cover visitor redirect and TA denial before any list request. The page defaults to Open, exposes selection through `aria-pressed`, clears the old view's results and cursor on switch, renders all four statuses through the shared card, and uses a generation counter to discard stale responses. Response parsing rejects invalid objects, malformed summaries, wrong-view statuses, duplicate IDs within a page, and invalid/oversized cursors before rendering. Initial loading, empty, error/retry, load-more, and additional-page error/retry states are distinct. Later-page failures retain loaded cards.

Duplicate-request handling: `loadMore` checks a synchronous `pending` ref before starting and sets it before awaiting the request; its button is also disabled while pending. Additional-page retry reuses this guarded `loadMore` path, and the focused UI suite exercises load-more duplicate suppression. Initial retry does not have a synchronous pending guard. A follow-up review-only UI test dispatched two Retry clicks inside one React `act`; both handlers ran before the state update removed the Retry control and issued two requests. See the follow-up review below.

**Finding — Low — repeated initial Retry can duplicate a request.** `src/codeclinic/src/tickets/MyTicketsPage.tsx`, `loadFirstPage`/initial Retry: `loadFirstPage` sets React load state to `loading` before awaiting, but has no synchronous in-flight guard. Two Retry click events dispatched in the same React batch both invoke it and cause two identical `GET /api/tickets?view=open` requests. This misses the pending-request duplicate suppression requirement. Add a synchronous initial-request guard (including retry) and a UI regression test that dispatches repeated Retry clicks before React commits the pending state. No ticket mutation or authorization bypass was observed; this is duplicate read traffic and an acceptance-criteria failure.

The account/session authorization remains server-side; the list endpoint derives owner identity from the current session/account and returns only projected summaries. Ticket text is rendered as React text, not HTML. The page's responsive DOM structure is covered, while actual 320 CSS-pixel rendering and visual focus/contrast remain for the required human check under T04.

### T04 — Integration verification and guides

**Verdict: pass with follow-up.**

The synthetic emulator test seeds two Students and tickets in all four statuses, uses tied timestamps, verifies two 20-ticket pages for both Open and Closed, and confirms the other Student receives only their own list. It cleans up synthetic records. The User Guide explains the default Open and Closed meanings, pagination/retry, status labels, and preserved dashboard link. The Developer Guide documents the protected endpoint, server-derived owner, cursor/order, index dependency, and emulator coverage. The local emulator was used only at `127.0.0.1:8080`; no live Firebase access or index deployment occurred.

No T04 production/security finding was identified. The required human rendered check at 320 CSS pixels remains unverified; no browser observation or screenshot was supplied. Production index deployment also remains outside scope and unverified. Do not mark the human visual criterion complete until the human reports the direct-route, toggle/keyboard, overflow, terminal-card contrast, and visible-focus observations.

### Combined disposition, evidence, and handoff

**Batch 2 conclusion: changes required.** T03 has the duplicate initial Retry request finding above. T04 integration and guide criteria pass with follow-up, with the human rendered verification at 320 CSS pixels still open. Runtime-provided token metrics are unavailable. A review-only test was added only to the separate temporary clone, not to the original workspace. The original checklist remains unchanged; T03/T04 are still unchecked pending orchestrator reconciliation and the human visual result.

The implementer report retains the earlier broad repository run as **77 suites passed, 1 failed, 6 skipped**; the sole failed suite was the unrelated TA index-shape suite. Per the user's scope steering, no TA queue/TA AI suite was run or used as a Batch 2 gate. Keep the broad-run failure in evidence as outside the revised Student-only scope.

Exact commands, outputs, and diff inventory are in [review-batch-2.md](../../../logs/tasks/student-my-tickets/review-batch-2.md).

### T03 initial Retry duplicate-request follow-up

The parent requested an observable check of two initial Retry clicks dispatched before React commits the loading state. A review-only test in the separate clone dispatched both clicks inside one `act`, after an initial synthetic 503. Result: **failure reproduced** — request count increased from 1 to 3 (two Retry requests), where the expected count was 2. This confirms the Low finding above and supersedes the earlier T03 pass-with-follow-up verdict: **T03 verdict is changes required**. The exact test and result are recorded in the Batch 2 execution log. The human 320 CSS-pixel visual check remains open.

### T03 approved correction re-review and T04 human verification

The human approved the narrow correction and independent re-review (`approval-batch-2-correction.md`). The implementer added a generation-keyed synchronous guard before the initial request and an implementation regression test that dispatches two Retry clicks within one React `act` batch. In the separate clean clone, the corrected `MyTicketsPage.tsx` and `StudentMyTickets.test.tsx` were copied from the workspace and matched their originals by SHA-256 (see the execution log). The page sets the in-flight generation before state updates/fetch, blocks a second request for that generation, and clears only the matching generation in `finally`; a later view generation can proceed while a prior response is stale.

The focused Student suites plus the review-only Retry repro passed: 6 suites, 61 tests. The Retry check now observes only one additional request from two same-batch Retry clicks. The production build also passed. No TA queue/TA AI suites were run. **Updated T03 verdict: pass.** The previous Low finding is resolved by the approved correction and passing regression evidence.

For T04, the human's `verification-T04-human.md` reports a pass at `/student/tickets`, 320 × 800 CSS pixels, for the requested rendered behavior. This is recorded as **pass by human report**; I did not independently observe the browser rendering. The evidence does not separately say whether Retry was triggerable during that check; automated retry and keyboard coverage remains the evidence for those interactions. Combined with the previously reviewed Student emulator integration, guides, and build, **updated T04 verdict: pass**. Production Firestore index deployment remains outside scope and unverified.

**Updated Batch 2 conclusion: pass.** T03's request guard correction and regression check resolve the only code finding; T04's human visual evidence closes its assigned rendered-check criterion. The original checklist remains unchanged for orchestrator reconciliation. Exact follow-up commands, results, SHA-256 parity, and the human evidence reference are in [review-batch-2.md](../../../logs/tasks/student-my-tickets/review-batch-2.md).
