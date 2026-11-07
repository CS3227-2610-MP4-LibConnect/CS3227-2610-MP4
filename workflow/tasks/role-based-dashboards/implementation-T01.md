# T01 correction implementation addendum

Task: `role-based-dashboards` T01 correction for independent-review finding F-01
Specification: `workflow/specs/role-based-dashboards.md` v0.1
Scope: the approved correction is limited to session-check race handling in `DashboardRouteGuard` and focused regression coverage.

## Result

Implemented a monotonically increasing request generation in the dashboard route guard. A session response can update guard state or redirect only when its generation is still current and its route remains active. Each manual retry calls the same validation function and receives a new generation.

Added integration regressions for a late member response after successful librarian validation and a late 401 after successful librarian validation. The stale responses leave the librarian dashboard visible and do not cause an access-denied view or redirect.

## Files changed for this correction

- `src/libconnect-mp4/src/DashboardRouteGuard.tsx`
- `src/libconnect-mp4/test/DashboardRoutes.integration.test.tsx`

## Verification

See [`logs/tasks/role-based-dashboards/implementation-T01.log`](../../../logs/tasks/role-based-dashboards/implementation-T01.log) for commands and exact outcomes. The focused integration suite passed (24 tests), and the production build compiled successfully.

## Deviations and unresolved risks

No specification change or dependency change was made. The correction was verified through the focused Jest integration suite and production build. Independent review remains pending; this addendum does not update checklist status or approve merge.

## F-02 follow-up

After human approval of the F-02 correction, effect cleanup now invalidates a pending request generation after a real unmount. A lifecycle version defers cleanup invalidation by one microtask so React Strict Mode's immediate effect replay does not invalidate the still-mounted guard. The existing generation and current-route checks remain in place.

Added a regression that starts a member check, leaves the route, revisits and verifies the member dashboard, then releases the first visit's 401. The old response must not redirect the verified visit. The focused suite passes with this case included. Two intermediate focused-suite attempts failed (13 of 25 tests) when cleanup invalidated the Strict Mode replay request; both failures are preserved in the factual log. The final cleanup behavior resolves that issue.

See [`logs/tasks/role-based-dashboards/implementation-T01.log`](../../../logs/tasks/role-based-dashboards/implementation-T01.log) for exact verification. The initial real-browser refresh coverage limitation noted by independent review remains outside this scoped correction. Independent re-review remains pending.
