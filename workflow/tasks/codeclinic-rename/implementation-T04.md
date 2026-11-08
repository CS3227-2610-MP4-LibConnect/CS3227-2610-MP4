# Implementation report: codeclinic-rename T04 — Remove the retired Book catalog

Status: **complete** (uncommitted; awaiting independent review and the merge decision)
Implementer: `implementer` agent; Date: 2026-11-08
Worktree/branch: `wt/t04`, `codeclinic-rename-t04`, base `da3c249`
Inputs: member-catalog-search (Retired, approved 2026-11-08); role-based-dashboards v0.5 R2, R7; `tasks.md` v0.1 and `handoff.md` v0.1 (approved); G3 dispatch under the standing approval in `logs/tasks/codeclinic-rename/integration-G1.md`; review-G2 finding F3
Execution log: [`logs/tasks/codeclinic-rename/implement-T04.md`](../../../logs/tasks/codeclinic-rename/implement-T04.md)

## Changed files (`src/codeclinic/`)

| File | Change |
| --- | --- |
| `server/catalog/adapter.js`, `contract.js`, `route.js` | Deleted (`git rm`) |
| `src/MemberCatalog.tsx`, `src/MemberCatalog.css` | Deleted (`git rm`) |
| `scripts/seed-local-books.js` | Deleted (`git rm`); `scripts/` is now empty and gone |
| `test/member-catalog.adapter.test.js`, `test/member-catalog.endpoint.test.js`, `test/MemberCatalogCards.test.tsx`, `test/MemberCatalogSearch.test.tsx`, `test/seed-local-books.test.js` | Deleted (`git rm`) |
| `server/auth/login.js` | Removed the `../catalog/route` import and the `options.catalogDb` mount of `GET /api/member/catalog`. Email re-export kept |
| `server/index.js` | `createLoginApp(...)` no longer receives `{ catalogDb: db }` |
| `src/StudentDashboard.tsx` | No `MemberCatalog`. Basic landing view matching `TADashboard.tsx`: `h1` "Student Dashboard", `section.dashboard-panel` with the `h2` greeting "Welcome back[, name]" and "Welcome to your Student landing page." |
| `src/DashboardViews.css` | **Review F3:** moved `.student-navbar a:focus-visible, .student-navbar button:focus-visible { outline: 3px solid var(--lc-color-focus); outline-offset: 3px; }` here, unchanged, from the deleted `MemberCatalog.css` |
| `test/DashboardRoutes.integration.test.tsx` | Removed the catalog-only `/api/member/catalog` fetch stub in `renderAppAt` (no assertion changed; 58 → 58 `expect(`) |
| `test/server.test.js` | **Added:** `GET /api/member/catalog` returns 404 with no frontend shell (12 → 14 `expect(`). Before this change an unauthenticated request got 401 from the catalog handler, so the 404 shows the route is gone |
| `test/SharedTheme.test.tsx` | **Added:** `DashboardViews.css` must contain the student navbar `:focus-visible` outline rule (23 → 24 `expect(`) |

## Acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| No catalog route, module, or test remains | Deletions above; `grep -rin "catalog\|book" src server test` returns only the new 404 test (log #6) | Met |
| `GET /api/member/catalog` no longer exists | `server.test.js` 404 assertion passes | Met |
| Student dashboard renders the name greeting (R2) | `DashboardRoutes.integration.test.tsx` greeting test and `SharedTheme.test.tsx` pass | Met |
| Consistent with the TA dashboard and shared theme (R7) | Same `dashboard-page` / `dashboard-panel` structure as `TADashboard.tsx`; shared-theme tests pass | Met |
| Visible keyboard focus for the student navbar kept (F3) | Rule moved to `DashboardViews.css`; new `SharedTheme` assertion | Met |
| Full suite passes | 14 suites passed, 1 skipped; 220 tests passed, 1 skipped; build compiled successfully (log #4–5) | Met |

## Deviations and notes

- Test changes beyond deletions: one catalog-only stub removed and two assertions added (404 route, F3 focus rule). No existing assertion was weakened.
- `npm ci` failed with ENOSPC (disk full). The orchestrator freed space and replaced `node_modules` with a symlink to the shared install; I did not re-run `npm ci`. Tests and build ran against that shared install.
- `.student-dashboard` keeps its wider 1180 px width (it matches the navbar padding); I did not change layout CSS beyond the F3 move.

## Leftovers and risks

- `src/codeclinic/README.md` lines ~17–27 still describe seeding Books with `node scripts/seed-local-books.js`, which no longer exists. README is outside T04's file list; the orchestrator assigns it to T05.
- The "LibConnect" text in `server.test.js` (including the new assertion) and elsewhere belongs to T05.
- `docs/` guides still describe the catalog (T07).
- I did not visually check the focus outline or the 320 px layout. The CSS rule moved unchanged.
- The opt-in Firestore emulator suite was skipped (T08).

## Fix for review G3 F1 (Medium), 2026-11-08

The deleted `test/MemberCatalogSearch.test.tsx:35-41` test "provides dashboard navigation and keeps logout available" was not catalog-only. I restored it as a new `describe('student dashboard navigation')` block at the end of `test/DashboardRoutes.integration.test.tsx` (test at line 343), with a `StudentDashboard` import added. The brand-link `href` `/student/dashboard` and logout-visible assertions are identical. Dropped only the `await screen.findByText('No books found.')` line and the catalog fetch stub. Setup that is not needed was also dropped (the empty-catalog mock). `expect(` count in that file is 58 → 60. Results after the fix: 14 suites passed, 1 skipped (15); 221 tests passed, 1 skipped (222); build compiled successfully. See log #9–11.
