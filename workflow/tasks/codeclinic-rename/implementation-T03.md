# Implementation report: codeclinic-rename T03 — Role dashboards and routes

Status: **complete** (uncommitted; awaiting independent review and the human merge decision)
Implementer: `implementer` agent; Date: 2026-11-08
Worktree/branch: `wt/t03`, `codeclinic-rename-t03`, base `befe61e`
Inputs: role-based-dashboards v0.5 (approved); `tasks.md` v0.1 and `handoff.md` v0.1 (approved); G2 dispatch per `logs/tasks/codeclinic-rename/integration-G1.md`
Execution log: [`logs/tasks/codeclinic-rename/implement-T03.md`](../../../logs/tasks/codeclinic-rename/implement-T03.md)

## Changed files (`src/codeclinic/`)

| File | Change |
| --- | --- |
| `src/MemberDashboard.tsx` → `src/StudentDashboard.tsx` (`git mv`) | Component `StudentDashboard`; heading "Student Dashboard"; class/id `student-dashboard`; still renders `MemberCatalog` (T04 removes it) |
| `src/LibrarianDashboard.tsx` → `src/TADashboard.tsx` (`git mv`) | Component `TADashboard`; heading "TA Dashboard"; class/id `ta-dashboard`; panel text "TA workspace" / "Welcome to your TA landing page." |
| `src/DashboardRouteGuard.tsx` | Imports the new modules; accepts only server-returned `STUDENT`/`TA` (resolves review-G1 F1); denial link `/student/dashboard` or `/ta/dashboard` with label Student/TA. Any other value, including `MEMBER`/`LIBRARIAN`, still goes to the retry state (fail closed) |
| `src/index.tsx` | Routes `/student/dashboard` (STUDENT) and `/ta/dashboard` (TA); former paths fall through to the login page |
| `src/LoginPage.tsx` | Post-login navigation STUDENT→`/student/dashboard`, TA→`/ta/dashboard` |
| `src/DashboardLogout.tsx` | Prop `memberNavigation`→`studentNavigation`; navbar classes `student-navbar*`; brand link `/student/dashboard` ("LibConnect" text left for T05) |
| `src/DashboardViews.css`, `src/MemberCatalog.css` | `.member-dashboard`/`.member-navbar*` selectors → `student-*` to match the renamed classes |
| `server/index.js` | Frontend shell served only at `/student/dashboard`, `/ta/dashboard` |
| `test/DashboardRoutes.integration.test.tsx` | Paths, `STUDENT`/`TA` mocks, heading/link regexes, titles and variable names renamed; **added** a test that former paths render the login page, make no session request, and render no dashboard |
| `test/SharedTheme.test.tsx` | Imports, module filenames, headings, variable names renamed |
| `test/LoginPage.test.tsx`, `test/LoginPage.integration.test.tsx` | Dashboard destinations only |
| `test/server.test.js` | Paths renamed; **added** assertions that former paths return 404, no shell, no redirect |
| `test/MemberCatalogSearch.test.tsx` | Minimum rename to compile: import/component `StudentDashboard`, path `/student/dashboard` |

## Acceptance criteria (role-based-dashboards v0.5)

| Criterion | Evidence | Result |
| --- | --- | --- |
| R1 login navigation to new paths | `LoginPage.test.tsx`, `LoginPage.integration.test.tsx` | Met |
| R1/R6 dashboard revalidates session with STUDENT/TA | `DashboardRoutes.integration` revalidation, transition, stale-response tests | Met |
| R2 separate modules `StudentDashboard.tsx`/`TADashboard.tsx` imported by guard | `SharedTheme.test.tsx` | Met |
| R3 unauthenticated redirect / retry | `DashboardRoutes.integration` | Met |
| R4 cross-role denial with own-route link | `DashboardRoutes.integration` denial table | Met |
| R5 logout | `DashboardRoutes.integration` logout tests | Met |
| R7 shared theme | `SharedTheme.test.tsx` | Met |
| Former paths not served or redirected | new tests in `server.test.js` and `DashboardRoutes.integration` | Met |
| Full suite and build | 18 suites passed, 1 skipped; 263 passed, 1 skipped; build compiled | Met |

## Test-rule check

All existing test edits are 1:1 renames. No assertion was removed or weakened; `expect(` counts are equal or higher (DashboardRoutes 54→58, server 9→12, others unchanged).

## Deviations

1. `test/MemberCatalogSearch.test.tsx` changed (import, component, path) — the minimum allowed by the assignment to keep it compiling; T04 deletes it.
2. `src/MemberCatalog.css` lines 248-249: `.member-navbar` focus selectors renamed to `.student-navbar` so the navbar keeps its focus style after the class rename. T04 deletes this file.
3. CSS class names, the `studentNavigation` prop, and the TA panel text ("Library staff workspace", "librarian landing page") were renamed as part of the dashboard-module rename; not individually listed in T03.
4. Two new tests (former paths not served) beyond pure renames, to provide the T03 matrix evidence "the former paths are not served".

## Risks / not done

- "LibConnect" brand text, page title, cookie and storage names remain (T05). `/api/member/catalog` remains (T04).
- The opt-in Firestore emulator test was not run (T08).
- Merging with T06 (parallel): no file overlap expected; T03 did not touch `server/auth/*`.
