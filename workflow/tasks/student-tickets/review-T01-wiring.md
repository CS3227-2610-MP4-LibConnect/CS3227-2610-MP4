# Independent review: T01 server-wiring correction

Task: `student-tickets`, reopened T01 correction in assignment Batch 4  
Specification: v0.3; checklist: v0.2; handoff: v0.2  
Review basis: exact current source and tests in the shared workspace; the implementation is uncommitted, as disclosed in `assignment-batch-4.json`.

## Verdict: changes required

The correction resolves the observed registration-suite regression in the focused and full test runs. Ticket routing remains ahead of the login app's 8 KiB parser, and the ticket endpoint retains its 128 KiB limit, active-Student/session checks, forced-password restriction, and CSRF check. One narrow registration behavior differs from the pre-correction middleware order: the forced-password guard now runs before JSON parsing, so malformed registration JSON from a forced-password session receives `403` instead of the approved malformed-input `400`. The registration specification requires malformed requests to return `400` before writes (R4, scenario 9), and this correction was authorized to preserve registration behavior. Reorder the route middleware so its 8 KiB parser precedes the forced-password guard, and cover that combined case; then rerun the focused suites.

## Scope and evidence examined

- Approved `student-tickets` spec v0.3, checklist v0.2, handoff v0.2, assignment Batch 4, current-state index, and the explicit T01 correction approval record.
- `src/codeclinic/server/index.js`, `src/codeclinic/server/tickets/route.js`, `src/codeclinic/test/server.test.js`, registration API/endpoint tests, and the existing R7 guard tests.
- T01 implementation report and execution log; pre-correction T04 verification evidence in `t04-verification-pre-dispatch.md`.
- The current workspace contains other uncommitted task files. The Batch 4 assignment explicitly documents this shared-workspace separation exception. This review covers the correction hunk and its route interactions; it does not attribute the entire workspace diff to this correction.

The corrective server wiring in `index.js` mounts tickets before the login app, then mounts registration with a dedicated parser and registration-specific error boundary before `app.use(loginApp)`. The new server composition assertions cover registration success and ticket `413` handling. I found no Batch 3 dispatch, guide update, commit, merge, push, or deployment in the reviewed artifacts.

## Criteria and security trace

| Area | Evidence and result |
| --- | --- |
| Registration success and status behavior | Focused registration API/endpoint suites passed. Malformed JSON and over-8 KiB input remain `400` with no write under ordinary visitor requests. The dedicated route maps parser and validation errors to the safe registration `400`, and non-validation failures to generic `503`. **Finding:** guard-before-parser changes malformed-input status for a forced-password session; see finding below. |
| Forced-password guard | The route calls the existing `createForcedPasswordChangeGuard`. I also ran a synthetic local request with an active Student session marked `mustChangePassword`; it returned `403/PASSWORD_CHANGE_REQUIRED` and made zero registration persistence calls. The ticket route independently rejects forced-password accounts. Existing R7 guard suite passed. |
| Ticket request-size boundary | `createTicketsRouter` is mounted before `loginApp`; its own strict JSON parser is capped at `128 * 1024` bytes and its local parser handler returns `413`. The server composition test submits a body above 128 KiB and asserts the exact safe `413` response. |
| Ticket authentication and CSRF | The ticket API suite passed tests for visitor/role denial, active account recheck, forged server fields, and CSRF. Source review confirms authentication from the cookie-backed session, stored active Student recheck, forced-password check, then CSRF comparison before validation/write. |
| Ticket storage and state | Existing T01 storage and API coverage passed. The correction does not alter ticket validation or persistence, and no route for replies or later state transitions was added by the correction. |
| Data handling and scope | Error responses are generic and do not echo request bodies. The registration/ticket wiring adds no logging, credentials, external calls, notification writes, or dependencies. No unapproved scope change was found in the correction hunk. |

### Finding T01-W1 — Low: parser/guard order changes malformed registration status

**Location:** `src/codeclinic/server/index.js`, registration route middleware (around lines 31–33).  
**Evidence:** The new order is `createForcedPasswordChangeGuard(...)` followed by `express.json(...)`. Before the correction, the login app's shared JSON parser ran before its forced-password guard; parser errors were handled as `400`. The registration spec R4 and acceptance scenario 9 require malformed requests to return `400` before any write. With the new order, an authenticated forced-password session is rejected by the guard before malformed JSON is parsed, yielding `403`. This is limited to combined malformed-input/forced-password requests and does not create data.  
**Recommended action:** Place the route-local 8 KiB parser before the guard while retaining the route-local safe parser error handler, and add a regression assertion that malformed JSON with a forced-password session returns `400` and makes no persistence call.

## Verification

Independent review commands, exact outcomes, and full captured output paths are recorded in [`logs/tasks/student-tickets/review-T01-wiring.md`](../../../logs/tasks/student-tickets/review-T01-wiring.md). The focused regression run passed 6 suites / 126 tests. The full suite passed 41 suites, with 3 skipped suites; 737 tests passed and 3 were skipped. The synthetic forced-password registration request returned the expected `403` with no write. The full run resolves the two registration-suite failures recorded before this correction, but does not remove finding T01-W1.

## Unverified criteria and residual risk

- T01-W1 remains unresolved. The checklist item remains open; this review does not update it.
- Browser keyboard and 320 CSS-pixel checks concern T04, not this server-wiring correction, and remain unverified as recorded in the pre-dispatch evidence.
- Because review and implementation share an uncommitted workspace, this is not a separate-checkout diff review. The independent focused and full test runs reduce, but do not eliminate, that separation limitation.

## Re-review of finding T01-W1

The initial **changes required** finding above is preserved as the first review result. The implementer changed the registration route order to run the strict 8 KiB JSON parser before the forced-password guard, retaining the same safe route-local parser error handler. The server composition regression test now checks that a valid registration from a synthetic forced-password session returns `403`, malformed JSON from that same session returns the safe `400`, and the registration persistence count does not increase. This resolves T01-W1 and restores parser-before-guard behavior.

I independently inspected the route and regression assertion, then reran all focused registration, ticket, storage, R7, and server composition suites: **6 suites passed; 126 tests passed**. The full verbose output is linked from the execution log below. The full suite result from the initial review remains valid recorded evidence (41 passed, 3 skipped; 737 tests passed, 3 skipped). I did not repeat the full suite because the follow-up only reorders the route-local parser and guard, and the current focused rerun exercises the changed route plus all affected registration/ticket/R7/server suites.

**Final T01 correction verdict after re-review: pass.** No T01-W1 finding remains open. The T04 browser inspection gap and shared-workspace separation limitation remain as recorded above; neither is introduced by this correction.
