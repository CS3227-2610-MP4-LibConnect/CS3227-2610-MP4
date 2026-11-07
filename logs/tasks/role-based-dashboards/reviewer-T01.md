# Factual review log: role-based dashboards T01

Date: 2026-11-07. Review performed against the approved specification v0.1, checklist v0.1, and handoff v0.1. Approval evidence was present in the artifacts.

## Review snapshot and files

- Inspected isolated snapshot `C:\Users\Junho\AppData\Local\Temp\libconnect-role-based-dashboards-review-1908fdc214f04f13a8153e71f941ebdc`, cloned from HEAD and overlaid with task changes by the orchestrator.
- Inspected `src/libconnect-mp4/src/LoginPage.tsx`, `src/libconnect-mp4/src/index.tsx`, `src/libconnect-mp4/src/DashboardRouteGuard.tsx`, `src/libconnect-mp4/test/LoginPage.test.tsx`, and `src/libconnect-mp4/test/DashboardRoutes.integration.test.tsx`.
- No production or test source files were modified during review. No review-only tests were added.

## Commands and exact results

Working directory: `src/libconnect-mp4` in the isolated snapshot.

1. `npm test -- --watchAll=false --runInBand --runTestsByPath test/LoginPage.test.tsx test/DashboardRoutes.integration.test.tsx -t "navigates to|invalid JSON|missing account type|unsupported account type|revalidates|rechecks|redirects an unauthenticated|fails closed|network rejection"`
   - Exit code 0.
   - `Test Suites: 2 passed, 2 total`; `Tests: 23 skipped, 13 passed, 36 total`; snapshots 0.
   - Node emitted the existing `[DEP0040]` `punycode` deprecation warning.
2. `npm test -- --watchAll=false --runInBand --runTestsByPath test/LoginPage.test.tsx`
   - Exit code 0.
   - `Test Suites: 1 passed, 1 total`; `Tests: 14 passed, 14 total`; snapshots 0.
   - Node emitted the existing `[DEP0040]` `punycode` deprecation warning.

## Result and limits

- Login destination and malformed/denied response cases passed.
- Route session validation, 401 redirect, failure retry, and route-transition checks passed in the focused run.
- The route suite simulates direct route mounting and `popstate` transition, but does not automate a real browser refresh. This is recorded as a low-severity follow-up in `workflow/tasks/role-based-dashboards/review-T01.md`.
- No external services or live accounts were accessed.
- Runtime usage metrics: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.

## F-01 correction re-review

Date: 2026-11-07. Re-review against approved specification v0.1 and the T01 correction addendum. The same isolated snapshot was used. Inspected the corrected `DashboardRouteGuard.tsx` and `DashboardRoutes.integration.test.tsx`, along with the T01 login/routing diff. No production files or shared checklist/handoff files were edited.

Working directory for commands: `src/libconnect-mp4` in the isolated snapshot.

1. `npm test -- --watchAll=false --runInBand --testPathPattern=DashboardRoutes.integration.test.tsx`
   - Exit code 0.
   - `Test Suites: 1 passed, 1 total`; `Tests: 24 passed, 24 total`; snapshots 0.
   - Includes late member success and stale 401 after member-to-librarian route transition. Node emitted `[DEP0040]` punycode deprecation warning.
2. `npm run build`
   - Exit code 0; optimized production build compiled successfully.
   - Node emitted `[DEP0176]` `fs.F_OK` deprecation warning.
3. `npm test -- --watchAll=false --runInBand --testPathPattern=DashboardRouteRace.review.test.tsx`
   - Exit code 1, expected review failure.
   - `Test Suites: 1 failed, 1 total`; `Tests: 1 failed, 1 passed, 2 total`.
   - The existing route-transition regression passed. The added review-only same-route unmount/remount stale-401 test failed because the old guard redirected the newer verified `/member/dashboard` visit to `/`.
4. `git diff --check`
   - Exit code 0. Git emitted LF-to-CRLF normalization warnings for modified task snapshot files.

Review-only test: added the same-route unmount/remount stale-401 regression to `src/libconnect-mp4/test/DashboardRouteRace.review.test.tsx` inside the isolated snapshot only. It is not an implementation-tree change and is not committed. No secrets, live accounts, or external services were used.

Re-review verdict: changes required for F-02. The stale response race across navigation away and remount is described in `workflow/tasks/role-based-dashboards/review-T01.md`. Runtime usage metrics: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.

## F-02 correction re-review

Date: 2026-11-07. Reviewed the human-approved F-02 correction against role-based dashboards specification v0.1, checklist v0.1, and handoff v0.1. The isolated snapshot path is unchanged. SHA-256 checks confirmed that the snapshot and workspace copies match for:

- `src/libconnect-mp4/src/DashboardRouteGuard.tsx`: `539E2EF326D21EBFD68AE7C348D671DCDC3EE8754974A68C3CCA9AE76044ACFB`.
- `src/libconnect-mp4/test/DashboardRoutes.integration.test.tsx`: `A23113D35FA631751A227A504ED0CB46E088DC362A578F87C7B417AC7CD44388`.

Inspected the effect cleanup and lifecycle version, focused integration regressions, and isolated review-only race tests. The main integration tree uses React Strict Mode, so its passing route checks exercise immediate cleanup/setup replay. No production code, task checklist, or handoff was edited in this re-review.

Working directory for commands: `src/libconnect-mp4` in the isolated snapshot.

1. `npm test -- --watchAll=false --runInBand --testPathPattern=DashboardRoutes.integration.test.tsx`
   - Exit code 0.
   - `Test Suites: 1 passed, 1 total`; `Tests: 25 passed, 25 total`; snapshots 0.
   - Passed stale member success and stale 401 after cross-route navigation, same-route unmount/remount invalidation, direct-route 401, fail-closed cases, and logout integration checks. Node emitted `[DEP0040]` punycode deprecation warning.
2. `npm test -- --watchAll=false --runInBand --testPathPattern=DashboardRouteRace.review.test.tsx`
   - Exit code 0.
   - `Test Suites: 1 passed, 1 total`; `Tests: 2 passed, 2 total`; snapshots 0.
   - Both the stale success cross-route test and the stale 401 same-route remount test passed. This file remains review-only in the isolated snapshot.
3. `npm run build`
   - Exit code 0; optimized production build compiled successfully.
   - Node emitted `[DEP0176]` `fs.F_OK` deprecation warning.

No live browser refresh was run. The previous low-severity browser-level refresh/deep-link coverage gap remains. No external service or real account was accessed.

F-02 correction re-review verdict: pass with follow-up. The stale response issue is resolved; the browser-refresh coverage limitation remains. T01 is still unchecked in the shared checklist. Runtime usage metrics: model `unavailable`; input tokens `unavailable`; output tokens `unavailable`; total tokens `unavailable`; metric source `unavailable`.
