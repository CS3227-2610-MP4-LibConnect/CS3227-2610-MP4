# T03 independent review: CSRF protected dashboard logout

- Task: `role-based-dashboards`, checklist T03.
- Reviewed versions: specification v0.1, task checklist v0.1, analyst handoff v0.1; the artifacts record human approval on 2026-11-07. T03 implementation handoff and execution log were reviewed.
- Review checkout: isolated local clone at `C:\Users\Junho\AppData\Local\Temp\libconnect-role-based-dashboards-review-1908fdc214f04f13a8153e71f941ebdc`, cloned from HEAD and overlaid with the current task changes. No production files were edited.
- Verdict: **changes required**.

## Acceptance traceability

| Criterion | Evidence and status |
| --- | --- |
| R5: both dashboards have accessible logout controls | `DashboardViews.tsx` wraps both views in `DashboardLogout`; the button has the accessible name “Log out.” Focused tests assert visibility on both routes. **Satisfied.** |
| R5: GET CSRF, then same-origin POST with token; only 204 or logout 401 completes | `DashboardLogout.tsx` checks CSRF response status and parses a non-empty string token before posting with `credentials: 'same-origin'` and `X-CSRF-Token`. It invokes state clearing and root navigation only for logout status 204 or 401. Tests cover token-bearing POST, 204, and 401. **Satisfied.** |
| R5: 403, service, malformed-token, and network failures keep dashboard hidden and permit retry | The component replaces protected content with an alert and retry control on each unconfirmed outcome. Focused tests cover 403, 503, missing token, CSRF network failure, and logout network failure. **Satisfied.** |
| R5/R6: server invalidation and later denial | Existing synthetic React-to-Express integration test confirms a valid CSRF logout returns 204, removes the server session, clears the cookie, and a subsequent session check returns 401. The focused dashboard test also checks later route denial, using a mocked 401. **Satisfied by existing integration evidence; the route test alone does not prove server invalidation.** |
| R6: route transition revalidation remains race-safe | `DashboardRouteGuard.tsx` starts a request for each account type but does not scope completion updates to the latest route/request. An earlier request can resolve after a newer route request and overwrite its state. This is a correctness gap; see finding F-01. **Not satisfied.** |

No client-selected role, token, or session identifier is trusted by the logout component. The CSRF token stays in memory and is not rendered or logged. Dashboard content is hidden while logout is pending or unconfirmed. No changes to server authorization or logout handling were in the reviewed T03 source files.

## Findings

### F-01 — Medium — stale session response can strand a route transition

- Location: `src/libconnect-mp4/src/DashboardRouteGuard.tsx:12-45` (with route changes keyed at lines 50-55).
- Evidence: `validateSession` captures the current `accountType`, then unconditionally calls `setVerifiedAccountType` and `setState` when its asynchronous fetch completes. There is no request generation check, cancellation, or current-route check. Reproduction by control-flow inspection: start a `/member/dashboard` session check and leave it pending; transition to `/librarian/dashboard`; let the librarian check return `LIBRARIAN` and render the librarian dashboard; then resolve the earlier request with `MEMBER`. The old request sets `verifiedAccountType` to `MEMBER` and state to `ready`. The current guard requires the verified role to equal `LIBRARIAN`, so it renders “Checking your session…” indefinitely, without retrying.
- Requirement/risk: R6 requires validation on each route transition and correct handling of stale/session changes. The stale completion does not expose protected content, but it can leave a user unable to enter a verified dashboard until navigating again or reloading. The current transition test resolves only one request and does not exercise out-of-order responses.
- Recommended action: make each validation completion conditional on the latest request and route (for example, a monotonically increasing request identifier), and add a focused out-of-order transition test proving stale responses cannot overwrite the latest state.
- Checklist coordination: this is in the shared route guard and appears to concern T01/R6 rather than the logout flow itself. T01 is not marked complete in the reviewed checklist. The orchestrator should resolve this guard issue before treating the combined R6 route behavior as accepted; no checklist state was changed here.

## Scope and risks

The isolated snapshot's working tree also contained broader task files, including login routing, the app route switch, Express deep-link handling, and unrelated workflow planning edits. The review inspected the route switch and relevant integration coverage to understand dependencies, but made no changes. The T03 implementation additions examined were `DashboardLogout.tsx`, `DashboardViews.tsx`, `DashboardRouteGuard.tsx`, and `DashboardRoutes.integration.test.tsx`; related server invalidation evidence was read from `LoginPage.integration.test.tsx` and server implementation. No unapproved dependency or external service use was observed in the T03 changes.

No review-only tests were added. No secrets or real user data were accessed. Remaining risk is F-01; focused logout behavior and server invalidation passed the checks recorded in the linked execution log.

Execution log: [reviewer-T03.md](../../../logs/tasks/role-based-dashboards/reviewer-T03.md).

Runtime usage: input tokens unavailable; output tokens unavailable; total tokens unavailable; model unavailable to this runtime; metric source unavailable.

## Re-review after the F-01 correction

Date: 2026-11-07. Reviewed the same approved specification v0.1, checklist v0.1, and handoff v0.1 in the isolated snapshot named above. The snapshot includes the T01 correction to `DashboardRouteGuard.tsx`, the two implementation route-race regressions, and the review-only `DashboardRouteRace.review.test.tsx`. This is a follow-up to the earlier T03 review; the original finding and result above are retained as history.

### Updated result

The original F-01 sequence is resolved for a member-to-librarian transition: the shared guard checks both the request generation and current pathname before allowing a response to update state or redirect. The implementation regressions for a late member success and late 401 both pass. T03 logout behavior also passes both the focused dashboard/logout suite and the synthetic React-to-Express invalidation integration test.

The overall re-review verdict remains **changes required** because a review-only lifecycle regression failed. The request generation is scoped to each mounted guard instance. An old guard that has unmounted can still see its original route become current again on a later visit, and its unchanged local generation then passes the pathname/generation check. If that old request returns 401, it redirects the newer visit to `/` despite the new guard already verifying the session and rendering the dashboard.

### Finding F-02 — Medium — stale 401 from an unmounted guard redirects a later same-route visit

- Location: `src/libconnect-mp4/src/DashboardRouteGuard.tsx`, `validateSession` / `isCurrentRequest`.
- Evidence: review-only regression `src/libconnect-mp4/test/DashboardRouteRace.review.test.tsx`, test `stale 401 from an unmounted guard cannot redirect a later visit to the same route`, fails. It starts a member-route check, navigates away and unmounts that guard, mounts a new member-route visit and validates it successfully, then resolves the old check with 401. Observed pathname is `/`; expected pathname is `/member/dashboard`. The current guard's request counter is per component instance, and its check tests the route pathname but not whether that component instance remains mounted/current.
- Requirement/risk: R6 requires each route entry to validate the current session and stale session responses to deny access appropriately. Here, a stale request from a prior visit overrides a newer successful validation. It does not expose protected content, but causes an incorrect redirect and interrupts a valid route.
- Recommended action: invalidate the request on effect cleanup/unmount (or use an equivalent per-instance active/cancellation guard) so an obsolete guard cannot update state or dispatch navigation after a later visit, and retain a regression for leaving and revisiting the same route before the original request resolves.
- Checklist coordination: T01 remains unchecked in the main checklist. Return F-02 to the orchestrator for scoped correction/review coordination; no checklist or handoff status was changed here.

### Re-review evidence and limits

| Criterion | Current result |
| --- | --- |
| T03 / R5 CSRF logout sequence, confirmation, error hiding and retry | Pass; focused suite covers both role controls, CSRF token POST, 204/401, 403/503, malformed/missing token, and network failures. |
| T03 / R5-R6 server invalidation and subsequent session denial | Pass; synthetic React-to-Express integration confirms 204, session deletion, cookie clearing, and subsequent 401. |
| Shared R6 cross-route stale response correction | Pass for the tested member-to-librarian success and stale-401 cases. |
| Shared R6 stale response after unmount and same-route revisit | Not satisfied; F-02 and failed review-only regression. |

No production files or review-only tests were modified during this re-review. No external services or real account data were accessed. A production build was not rerun because behavior verification for this route-guard correction was performed through the relevant Jest suites. Runtime metrics remain unavailable.

Execution details are in [reviewer-T03.md](../../../logs/tasks/role-based-dashboards/reviewer-T03.md).

## Re-review after the approved F-02 correction

Date: 2026-11-07. The human-approved correction is recorded in the T01 implementation addendum. The review snapshot's `DashboardRouteGuard.tsx` and `DashboardRoutes.integration.test.tsx` SHA-256 hashes match the main checkout exactly. Approved spec, checklist, and handoff remain v0.1; no approval or checklist state was changed.

### Updated verdict: **pass with follow-up**

T03 logout acceptance remains satisfied: the focused dashboard suite covers CSRF retrieval and token-bearing logout, 204/401 completion, 403/503/malformed-token/network handling, protected-content hiding, retry, and both dashboard controls. The React-to-Express integration confirms server session invalidation, cookie clearing, and subsequent 401 denial.

The F-02 same-route unmount/remount race now passes. Effect cleanup queues invalidation and checks a lifecycle version, preserving the active setup through React Strict Mode's immediate cleanup/setup replay while invalidating a truly unmounted guard. `index.tsx` renders the app under `<React.StrictMode>`, and the route integration tests render that captured app tree. The unmount/revisit regression passes; the old 401 no longer redirects the new verified visit. The earlier cross-route stale-success and stale-401 regressions also pass.

| Criterion | Re-review result |
| --- | --- |
| T03 / R5 CSRF logout and confirmed completion behavior | Pass. |
| T03 / R5-R6 fail-closed errors, retry, and protected-content hiding | Pass. |
| T03 / R5-R6 server invalidation and later denial | Pass in synthetic React-to-Express integration. |
| Shared R6 cross-route and unmount/remount stale-response handling | Pass in focused tests, including the review-only lifecycle suite. |
| Direct refresh in an actual browser | Not exercised in this re-review. The prior review noted component-level route checks and Express shell checks, but no real browser refresh. This remains a verification follow-up for the route/deep-link work, not a failing logout criterion. |

No new finding. The initial F-01 and F-02 reports and earlier failed runs remain in this report and log as history; the final correction results below supersede their unresolved status. No production code, test code, checklist, or handoff was modified by this reviewer. No external service or real account/session data was used. Runtime metrics are unavailable.

See the latest command results in [reviewer-T03.md](../../../logs/tasks/role-based-dashboards/reviewer-T03.md).
