# Review report: codeclinic-rename Group 3 (T04 — Remove the retired Book catalog)

Reviewer: independent `reviewer` agent (did not write this code). Date: 2026-11-08.
Worktree/branch: `wt/t04`, `codeclinic-rename-t04`, base `da3c249` (verified). Changes are uncommitted: 11 deletions staged with `git rm`, 7 edits unstaged, 3 untracked evidence files.
Diff reviewed: `git diff HEAD -M` (18 paths, +16 / -1575).
Inputs checked: `tasks.md` v0.1 and `handoff.md` v0.1 (human-approved 2026-11-08); `member-catalog-search.md` (Retired, approved 2026-11-08); `role-based-dashboards.md` v0.5 R2, R7 (human-approved 2026-11-08); `implementation-T04.md`; logs `implement-T04.md`, `integration-G3.md`; `review-G2.md` F3.
Execution log: [`logs/tasks/codeclinic-rename/review-G3.md`](../../../logs/tasks/codeclinic-rename/review-G3.md). Security review: [`security-review-G3.md`](security-review-G3.md).

This report is an assessment. It is not approval to merge or commit.

## Verdict

**Pass with follow-up.** No Critical or High finding. Every T04 criterion is met. All catalog code is gone, the route returns 404 with no frontend shell, and no other server behaviour changed. One Medium test-rule deviation: a deleted test file held a non-catalog navbar test that was not moved (F1).

## Acceptance-criteria traceability

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| `server/catalog/` removed, with the mount and `catalogDb` option | `server/catalog/{adapter,contract,route}.js` deleted; `server/auth/login.js` import and `options.catalogDb` block removed; `server/index.js:11` no longer passes `{ catalogDb: db }` | `grep -rin "catalog\|book" src server test` finds only the new 404 test | Met |
| `MemberCatalog.tsx`, `MemberCatalog.css`, `scripts/seed-local-books.js` removed | deleted; `scripts/` gone; `package.json` has no seed script | build compiles; grep clean | Met |
| Catalog tests removed | `test/member-catalog.*`, `test/MemberCatalog*`, `test/seed-local-books.test.js` deleted | — | Met (see F1) |
| `GET /api/member/catalog` no longer exists | no handler; with a build directory present, static and shell routes do not match it | `test/server.test.js:79-81` (404, no `<title>` shell); before T04 the same request returned 401 from the catalog handler, so the 404 is meaningful | Met |
| Student dashboard is a basic landing view with the name greeting (R2) | `src/StudentDashboard.tsx:9-13`: `h1` "Student Dashboard", `section.dashboard-panel` with `h2` "Welcome back[, name]"; no placeholder name | `DashboardRoutes.integration.test.tsx:58` greeting test | Met |
| Consistent with TA dashboard and shared theme (R7) | same `dashboard-page` / `dashboard-panel` / `aria-labelledby` structure as `TADashboard.tsx`; `.dashboard-panel` comes from `theme.css` and `DashboardViews.css` | `SharedTheme.test.tsx` | Met |
| Visible keyboard focus kept for the student navbar (G2 F3, R7) | `src/DashboardViews.css:55-59` — rule moved unchanged from `MemberCatalog.css:248-252` | new `SharedTheme.test.tsx:74` assertion | Met |
| Full suite and build pass | — | 14 suites passed, 1 skipped; 220 passed, 1 skipped; build compiled successfully | Met |

## Test-rule comparison (handoff "Test rules")

| File | `expect(` before → after | Change | Assessment |
| --- | ---: | --- | --- |
| `test/DashboardRoutes.integration.test.tsx` | 58 → 58 | Removed only the `/api/member/catalog` fetch stub in `renderAppAt` | Allowed; no assertion touched |
| `test/SharedTheme.test.tsx` | 23 → 24 | Added F3 focus-rule assertion | Strengthened |
| `test/server.test.js` | 12 → 14 | Added retired-route 404 assertions | Strengthened |
| `member-catalog.adapter/endpoint`, `MemberCatalogCards`, `seed-local-books` | deleted | Subject is only the catalog or seed | Allowed |
| `MemberCatalogSearch.test.tsx` | deleted | 12 of 13 tests are catalog-only; one is not (F1) | Deviation |

No assertion about security, validation, status codes, or fail-closed behaviour of a surviving feature was removed. The catalog endpoint's denial tests (`member-catalog.endpoint.test.js`) went with the endpoint they covered.

## Findings

| ID | Severity | Location | Evidence | Requirement / risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| F1 | Medium | `src/codeclinic/test/MemberCatalogSearch.test.tsx:35-41` (deleted, at `da3c249`) | Test `provides dashboard navigation and keeps logout available` asserted the student navbar brand link `href="/student/dashboard"` and that logout is visible on `StudentDashboard`. Only its last line (`No books found.`) was about the catalog. No remaining test asserts the brand link (`grep "Role('link'"` finds only the access-denied link and registration links). Logout visibility is still covered elsewhere (`DashboardRoutes.integration.test.tsx:247`). | Handoff test rule: delete only tests "whose only subject is the removed Book catalog". Coverage of the T03 brand-link rename (`src/DashboardLogout.tsx:71`) is lost. No behaviour change and no security assertion. | Move the test into a surviving file (for example `DashboardRoutes.integration.test.tsx` or a small `StudentDashboard.test.tsx`), dropping only the `No books found.` line. Can be done before merge or as a recorded follow-up. |
| F2 | Low | `src/codeclinic/README.md:17-27` | Still tells developers to run `node scripts/seed-local-books.js`, which no longer exists. | Docs match product; recorded leftover assigned to T05 in `implementation-T04.md`. | Confirm T05 (or T07) removes the section. |
| F3 | Info | `docs/UserGuide.md`, `docs/DeveloperGuide.md` | Still describe the catalog. | Recorded leftover for T07. | None for T04. |
| F4 | Info | `src/codeclinic/test/server.test.js:81` | New assertion uses `<title>LibConnect</title>`, matching the current shell. | T05 renames the title and must update this assertion too (it is a negative check, so it would silently pass after the rename unless updated). | Tell T05 to update the `not.toContain` title strings in `server.test.js` together with `public/index.html`. |
| F5 | Info | `logs/tasks/codeclinic-rename/integration-G3.md` | `node_modules` is a symlink to the shared install after ENOSPC; `npm ci` was not re-run in this worktree. | Results depend on the shared install matching `package-lock.json`; T04 changed no dependency. | None; recorded for traceability. |

## Scope

The diff touches only files named in T04 plus `DashboardViews.css` (G2 F3 handoff) and three tests. No dependency, lockfile, CI, deployment, auth, session, CSRF, registration, or route-guard file changed. `server/auth/login.js` changes are limited to the import and the conditional mount; the email re-export (G2 F4) is untouched.

## Criteria not verified

- Visual check of the focus outline and the 320 px layout (CSS rule moved verbatim; not rendered).
- Opt-in Firestore emulator suite (skipped; T08).

## Commands run

From `src/codeclinic`: `CI=true npm test -- --watch=false`, `npm run build`, `grep -rin "catalog\|book" src server test`. Exact results are in the log.
