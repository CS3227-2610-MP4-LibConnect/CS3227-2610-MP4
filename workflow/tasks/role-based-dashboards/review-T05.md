# Independent review: role-based dashboards T05

Date: 2026-11-07
Specification: `workflow/specs/role-based-dashboards.md` v0.1 (human-approved)
Checklist and handoff: v0.1 (human-approved); approved Group 1–4 layout and dispatch
Review snapshot: isolated clone of HEAD with the task changes overlaid; independent of the implementation working tree
Initial verdict: **changes required; superseded by the re-review addendum below**
Current verdict: **pass with follow-up**

## Scope reviewed

Reviewed the complete task diff in the isolated snapshot, including:

- Production source: `src/libconnect-mp4/server/index.js`, `src/libconnect-mp4/src/LoginPage.tsx`, `src/libconnect-mp4/src/index.tsx`, `DashboardLogout.tsx`, `DashboardRouteGuard.tsx`, and `DashboardViews.tsx`.
- Tests: `LoginPage.integration.test.tsx`, `LoginPage.test.tsx`, `server.test.js`, and `DashboardRoutes.integration.test.tsx`.
- Approved task/specification evidence and the `workflow/agents/task_grouper.toml` change. The profile change is the expressly approved dependency-safe task move. No unrelated implementation scope or dependency/configuration change was found.
- Prior T01–T04 implementation and review reports, including the T03 medium route-transition finding.

No production files were changed during this review. A review-only race regression test was created only in the isolated snapshot as `src/libconnect-mp4/test/DashboardRouteRace.review.test.tsx`; it is not part of the implementation diff.

## Acceptance trace

| Requirement | Result | Evidence |
| --- | --- | --- |
| R1 / scenarios 1–3: login destination and invalid/denied responses | Pass | Login uses only the successful response's supported account type to select the matching destination. Tests cover both destinations, 401/503, invalid JSON, missing type, and unsupported type. |
| R2: distinct dashboards and logout control | Pass | Separate member/librarian landing views identify the account type, and the route suite checks both accessible logout controls. |
| R3 / scenarios 4 and 6: unauthenticated and unavailable session behavior | Pass for application behavior | The guard checks the session before rendering, redirects on 401, and displays retry/login options for 503, malformed responses, and network errors. Express tests confirm both dashboard paths serve the shell on direct and repeated requests. Actual browser refresh was not run. |
| R4 / scenario 5: verified cross-role denial | Pass | Tests cover both mismatch directions and confirm the link follows the session-returned role. Query string and local storage do not grant the opposite dashboard. |
| R5 / scenarios 7–9: logout confirmation and failures | Pass | Dashboard tests cover CSRF fetch/token POST, 204 and 401 completion, 403/503 and malformed token errors, and network failures with dashboard content hidden. The React-to-Express integration confirms CSRF rejection preserves the session, valid logout removes it and clears the cookie, and a later session request returns 401. |
| R6 / scenario 10: revalidation and server-side session changes | Partial; route transition race fails | Existing session tests confirm server-side deactivation, stored-role change, and expiry denial. However, out-of-order client validation responses can strand a route transition in the checking state; see F-01. |
| Scenario 11 / future protected API | Not applicable to this change | No dashboard data/action API was introduced. The existing session endpoint is server-validated, but future protected feature APIs cannot be tested until they exist. |

## Initial review findings (retained for history)

### F-01 — Medium — stale session response can overwrite the current route result

- **Location:** `src/libconnect-mp4/src/DashboardRouteGuard.tsx:12-44`.
- **Evidence:** Each `validateSession` call captures its route's `accountType`, then unconditionally updates `verifiedAccountType` and `state` when its fetch completes. There is no request generation check, cancellation, or current-route check.
- **Reproduction:** The review-only test starts a member validation, transitions to the librarian path, resolves the librarian validation as `LIBRARIAN`, then resolves the older member validation as `MEMBER`. The old result overwrites the current state; the UI remains at “Checking your session…” and does not render the now-verified librarian dashboard. The test failed exactly at the expected librarian heading after the stale response.
- **Requirement/risk:** R6 requires session validation on route transitions and correct handling of stale state. The race fails closed (it does not expose the wrong dashboard), but strands the user without retry or a current-session recheck.
- **Recommended action:** Guard response commits with a monotonically increasing request identifier or cancellation/current-route check, then add the out-of-order transition test to the implementation suite.
- **Checklist coordination:** This is a route-guard issue under T01/R6. T01 is currently unchecked in the reviewed checklist, so no completed checkbox needs reversal. The orchestrator should return T01 for correction and rerun its acceptance checks before reconciling T05.

No other production finding was observed.

## Scope, security, and fixture review

- The route guard renders only after a supported server session role matches the requested path; client path/query/storage values do not grant authority.
- Logout hides dashboard content while pending or unconfirmed and uses the existing CSRF-protected server endpoint. No logout implementation merely deletes client state or a cookie.
- Dashboard content contains only basic landing text. No new protected data/action endpoint, role mutation, dependency, hosting/deployment configuration, Firestore rule, or external-service access was found.
- Tests use synthetic fixtures. No real credentials, hashes, session identifiers, CSRF values, or personal data were found in task test evidence.

## Initial review verification (retained for history)

The full suite and build passed in the isolated snapshot, but the independent race regression test failed. The exact commands, exit codes, suite totals, and test failure are in [reviewer-T05 execution log](../../../logs/tasks/role-based-dashboards/reviewer-T05.md).

## Initial review limits (updated by re-review addendum)

- R6 out-of-order route validation is not satisfied until F-01 is fixed.
- No real browser automation or deployed-hosting behavior was exercised; direct and refresh-equivalent route delivery was verified through Express requests.
- Scenario 11 is not directly testable because this change introduces no future protected dashboard API.

Runtime model: unavailable. Input tokens: unavailable. Output tokens: unavailable. Total tokens: unavailable. Metric source: unavailable.

## Re-review addendum — approved T01 F-01 correction

Date: 2026-11-07
Reviewed correction: T01 addendum for specification v0.1 and the approved F-01 route-validation race fix. The correction changes only `DashboardRouteGuard.tsx` and `DashboardRoutes.integration.test.tsx` within the previously approved source/test scope.

### F-01 result

**Resolved in the reviewed transition case.** The guard now assigns each session check a monotonically increasing generation and commits results or redirects only when the request is still the latest and the corresponding dashboard path remains active. The implementation integration suite covers late member success and late 401 after the librarian route check succeeds. Both cases leave the librarian route active with its verified dashboard. The isolated review-only regression test `DashboardRouteRace.review.test.tsx`, retained from the initial review, also passes with the corrected guard.

### Re-review verification

- Focused route and race suites: 2 suites passed; 25 tests passed.
- Full local test suite: 13 suites passed, 1 skipped; 256 tests passed, 1 skipped (14 suites, 257 tests total). This includes the isolated review-only regression test.
- Production build compiled successfully.
- `git diff --check` passed; Git emitted only line-ending normalization warnings.

Exact commands and results are appended to [reviewer-T05 execution log](../../../logs/tasks/role-based-dashboards/reviewer-T05.md).

### Current trace and residual limits

R1–R5 remain satisfied. R6 is satisfied for direct route entry, role transitions, and out-of-order success/401 responses; server session tests cover expiry, account deactivation, and stored-role changes. The task diff remains within the approved application source/test paths plus the explicitly approved task-grouper profile change. No authorization, dependency, hosting/deployment, Firebase, or external-service changes were found.

The review did not launch a real browser or deployed hosting environment. Route-guard boot behavior is covered through the React test harness, and deep-link/refresh-equivalent shell delivery is covered through repeated Express requests. A real browser refresh remains a low-severity follow-up if browser automation is added. Scenario 11 is not directly testable here because no protected dashboard feature API was introduced; future APIs still require their own server-side authorization checks.

No unresolved production finding remains. The initial F-01 finding is retained above as historical evidence and is resolved by the correction reviewed here. Runtime model and token metrics remain unavailable.

## Final re-review addendum — approved T01 F-02 correction

Date: 2026-11-07
Reviewed correction: human-approved T01 lifecycle fix for F-02 under specification v0.1. The snapshot's `DashboardRouteGuard.tsx` and `DashboardRoutes.integration.test.tsx` are hash-matched to the corresponding main repository files.

### F-02 result

**Resolved in the reviewed same-route remount case.** On real unmount, effect cleanup now invalidates the pending request generation. The lifecycle-version microtask preserves the request during React Strict Mode's immediate cleanup/setup replay. The route integration regression starts a member request, navigates to `/` to unmount the guard, revisits and verifies `/member/dashboard`, then resolves the first request with 401. It asserts the verified dashboard remains visible and the path stays `/member/dashboard`. The case passes.

F-01 behavior also remains covered: late member success and 401 responses after the newer librarian route check do not overwrite or redirect the active librarian route. The prior isolated review-only race suite passes with the final correction.

### Final verification

- Focused dashboard integration and review-only race suites: 2 suites passed; 27 tests passed.
- Full local suite: 13 suites passed, 1 skipped; 258 tests passed, 1 skipped (14 suites, 259 tests total). The review-only race test was included.
- Production build compiled successfully.
- `git diff --check` passed; Git emitted line-ending normalization warnings only.

Exact commands and results are appended to [reviewer-T05 execution log](../../../logs/tasks/role-based-dashboards/reviewer-T05.md).

### Final assessment

R1–R6 acceptance remains satisfied, including the F-01 and F-02 stale-response cases. No production finding remains in the reviewed scope. Current verdict remains **pass with follow-up**: the review did not launch a real browser to exercise a browser refresh. Direct route boot and server shell behavior are covered separately. Scenario 11 remains not applicable until a protected dashboard API is introduced. No production or checklist files were changed by this reviewer. Runtime model and token metrics are unavailable.
