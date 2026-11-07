# Independent review: role-based dashboards T01

Date: 2026-11-07
Initial verdict: **pass with follow-up**
F-01 correction re-review verdict: **changes required**

## Reviewed scope

- Approved specification v0.1, checklist v0.1, and handoff v0.1; approval records were present in the artifacts.
- T01: login destination, dashboard session revalidation, 401 handling, and fail-closed retry behavior (R1, R3, R6).
- Reviewed the exact T01 source and test changes in the isolated review snapshot, with related route-guard code inspected where it implements T02/T03 behavior. The snapshot was cloned from HEAD and overlaid with task changes; no production files were changed during review.
- Files examined: `LoginPage.tsx`, `index.tsx`, `DashboardRouteGuard.tsx`, `LoginPage.test.tsx`, and `DashboardRoutes.integration.test.tsx`.

## Acceptance trace

| Criterion | Evidence | Result |
| --- | --- | --- |
| Successful login uses the server-returned `MEMBER` or `LIBRARIAN` type for the approved destination; signed-in confirmation is removed. | `LoginPage.tsx` accepts only the two supported response values and calls `location.assign` with the corresponding route. Both destination cases pass. | Pass |
| Denied login, malformed success JSON, missing type, or unsupported type does not navigate or show authenticated UI. | Existing focused login tests exercise HTTP 401/503 and all three invalid-success-body cases. | Pass |
| Every dashboard route entry validates `/api/auth/session` before displaying dashboard content; a verified role must match the requested route. | `DashboardRouteGuard.tsx` begins in `checking`, requires HTTP 200 and a recognized server `accountType`, and only enters `ready` on a match. Both dashboard entry cases and a member-to-librarian `popstate` transition pass. | Pass |
| Confirmed HTTP 401 redirects to `/`; non-401 status, malformed session JSON, and network failure leave dashboard content hidden and expose retry. | Guard handles 401 separately and renders a retry state for other failures. Focused tests cover both direct-route 401s, 503, malformed body, network rejection, and transition revalidation. | Pass |
| Session checks do not trust the selected login type, URL query, or browser storage. | The guard makes its rendering decision from `/api/auth/session`; the login response only selects the initial destination. The related integration test sets a query and local-storage role while the server fixture reports the member role. | Pass |

## Findings

No production defect was found in T01.

### Follow-up coverage gap — low

- **Location:** `test/DashboardRoutes.integration.test.tsx`
- **Evidence:** The route suite captures and renders the app tree in Testing Library, and simulates route changes with `pushState` plus `popstate`. It does not launch a browser and reload either dashboard URL.
- **Requirement:** T01 calls for direct load, refresh, and transition validation (R3/R6). Initial direct-route mounting is covered and exercises the same guard effect as a fresh client load; an actual browser refresh remains unverified.
- **Recommended action:** Include a browser-level refresh/deep-link check in the later T04/T05 evidence if the available local test setup supports it. No T01 production change is required based on this gap.

## Security and scope review

- The guard does not render dashboard views from route, query, storage, or selected account type. It requires a server session response and fails closed on malformed or unavailable responses.
- No protected feature data or API was introduced in the reviewed T01 changes. Server-side session/account enforcement remains the responsibility of the previously approved authentication implementation.
- Reviewed files contain synthetic test fixtures; no credentials, session identifiers, cookies, or real personal data were observed in the relevant test changes.
- No dependency, deployment, hosting, or authentication policy change was part of the T01 source diff reviewed.

## Verification and unresolved risk

The exact review commands and results are recorded in [reviewer-T01.md](../../../logs/tasks/role-based-dashboards/reviewer-T01.md). Both commands passed. The only unresolved item is the low-severity browser refresh coverage gap above; it does not block T01 because the initial route-load path is exercised and the guard uses the same mount-time validation on reload.

Runtime usage metrics: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.

## Re-review of F-01 correction

The correction addresses the originally reported same-component route-transition race: a monotonically increasing request generation prevents an older request from replacing a newer route result, and the pathname check prevents a response from acting after navigation to a different path. The new integration cases for a late member success and late 401 after librarian validation both pass.

### Finding F-02 — medium, changes required

- **Location:** `src/libconnect-mp4/src/DashboardRouteGuard.tsx:14-17, 22-27`
- **Evidence:** `requestGeneration` is scoped to a guard component instance, and `isCurrentRequest` checks only that instance's generation and the current pathname. I added a review-only regression to `src/libconnect-mp4/test/DashboardRouteRace.review.test.tsx` in the isolated snapshot: start a member session request, navigate away so the guard unmounts, revisit `/member/dashboard` and let its new guard verify MEMBER, then resolve the old request with HTTP 401. The old instance sees the same pathname and its unchanged generation, redirects the currently verified visit to `/`, and the test fails at the route assertion.
- **Requirement/risk:** R6 requires route entry and transitions to reflect the current session check. An obsolete response from a prior visit can override the result of a newer successful check. This is a navigation/availability defect; it does not expose protected dashboard content or bypass authorization.
- **Recommended action:** Invalidate pending validation on guard cleanup/unmount (or otherwise scope freshness across component instances), then add this same-route remount/stale-401 case to the implementation regression suite. Preserve the existing same-instance out-of-order cases.

### Re-review verification

- The corrected focused integration suite passes: 1 suite, 24 tests.
- `npm run build` passes.
- The review-only unmount/remount stale-401 regression fails as expected: 1 of 2 review tests failed; the failure is that `window.location.pathname` became `/` after the new guard had rendered the member dashboard.
- `git diff --check` exits 0; Git reports only existing LF-to-CRLF normalization warnings.
- The initial actual-browser refresh coverage gap remains. No browser-level refresh was run in this re-review.

T01's original F-01 symptom is fixed for route changes handled by the mounted guard instance. F-02 remains a required correction, so T01 is not ready for a passing independent review. T01 remains unchecked in the shared checklist; no checklist state was changed.

Runtime usage metrics for this re-review: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.

## Re-review of F-02 correction

The F-02 cleanup correction resolves the unmount/remount stale-response finding. Effect cleanup defers invalidation by a microtask and compares a lifecycle version; React Strict Mode's immediate effect setup increments that version before the cleanup microtask, preserving the active validation. A real unmount leaves the version unchanged, so the cleanup invalidates the request generation and clears the auto-check marker. Generation and pathname checks continue to suppress stale results across route changes.

The isolated snapshot's `DashboardRouteGuard.tsx` SHA-256 matches the workspace implementation file (`539E2EF326D21EBFD68AE7C348D671DCDC3EE8754974A68C3CCA9AE76044ACFB`); `DashboardRoutes.integration.test.tsx` also matches (`A23113D35FA631751A227A504ED0CB46E088DC362A578F87C7B417AC7CD44388`).

The main route suite passed with 25 tests, including Strict Mode rendering, stale success and stale 401 across member-to-librarian navigation, and the same-route unmount/remount stale-401 regression. The separate review-only race suite passed both cases. The production build compiled successfully. No new production defect was found in the F-02 correction.

### Remaining follow-up — low

The actual browser refresh/deep-link behavior remains unverified by a browser-level check, as recorded in the initial review. Component-level fresh route mounts and the separately reviewed Express deep-link behavior provide coverage, but do not constitute a browser refresh. No live browser, deployed app, external service, or real account was accessed during this re-review.

**F-02 re-review verdict: pass with follow-up.** The finding is resolved by the implementation and passing regression. The only remaining T01 review limitation is the low-severity browser-refresh coverage gap. The shared checklist remains unchanged; T01 remains unchecked pending orchestrator reconciliation and the human merge gate.

Runtime usage metrics for the F-02 re-review: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.
