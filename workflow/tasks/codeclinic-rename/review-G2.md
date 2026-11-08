# Review report: codeclinic-rename Group 2 (T03, T06)

Reviewer: independent `reviewer` agent (did not write this code). Date: 2026-11-08.
Worktree/branch: `wt/g2`, `codeclinic-rename-g2`, base `befe61e` (verified). Changes are staged and uncommitted.
Diff reviewed: `git diff --cached -M` (29 staged paths), plus the untracked `logs/tasks/codeclinic-rename/integration-G2.md`.
Inputs checked: `tasks.md` v0.1 and `handoff.md` v0.1 (human-approved 2026-11-08); `role-based-dashboards.md` v0.5 (human-approved 2026-11-08); `role-aware-login.md` v0.3 R4 (human-approved 2026-11-08); `implementation-T03.md`, `implementation-T06.md`; logs `implement-T03.md`, `implement-T06.md`, `integration-G2.md`; `review-G1.md`.
Execution log: [`logs/tasks/codeclinic-rename/review-G2.md`](../../../logs/tasks/codeclinic-rename/review-G2.md). Security review: [`security-review-G2.md`](security-review-G2.md).

This report is an assessment. It is not approval to merge or commit.

## Verdict

**Pass with follow-up.** No Critical or High finding. Every T03 and T06 criterion is met and covered by tests. The follow-ups are one process item, one optional test, and one item to hand to T04.

## Acceptance-criteria traceability

### T03 (role-based-dashboards v0.5 R1–R7)

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| Modules renamed to `StudentDashboard.tsx` and `TADashboard.tsx` (R2) | new files; old files deleted | `SharedTheme.test.tsx` (reads both module sources and the guard imports) | Met |
| Routes `/student/dashboard` and `/ta/dashboard` (R1) | `src/index.tsx:22-23`, `src/LoginPage.tsx:75` | `LoginPage.test.tsx`, `LoginPage.integration.test.tsx`, `DashboardRoutes.integration.test.tsx:56-65` | Met |
| Guard accepts only server-returned `STUDENT`/`TA`, fails closed otherwise (resolves G1 F1) | `src/DashboardRouteGuard.tsx:48-51` exact match; any other value sets `retry` | `DashboardRoutes.integration.test.tsx:219-235` (503, empty body, network). No test of a 200 body with a former role (see F2) | Met |
| Cross-role denial with own-route link (R4) | `DashboardRouteGuard.tsx:95-104` | `DashboardRoutes.integration.test.tsx:194-217` | Met |
| Session revalidation on load, refresh, transition; 401 redirect (R3, R6) | unchanged logic | transition, stale-response, and 401 tests in `DashboardRoutes.integration.test.tsx` | Met |
| Logout via CSRF + POST, 204/401/403/outage handling (R5) | `DashboardLogout.tsx` (only the prop, class names, and brand href renamed) | logout tests `DashboardRoutes.integration.test.tsx:240-330` | Met |
| Brand link `/student/dashboard` | `DashboardLogout.tsx:71` | `MemberCatalogSearch.test.tsx:38` | Met |
| Frontend shell at new paths in `server/index.js` | `server/index.js:18` | `server.test.js:56-70` (direct and refresh, 200 + shell) | Met |
| Former paths not served or redirected | server serves no catch-all; client falls through to `LoginPage` | `server.test.js:72-77` (404, no shell, no `Location`); `DashboardRoutes.integration.test.tsx:172-182` (login page, no session request, no dashboard text, path unchanged) | Met |
| Shared theme (R7) | `DashboardViews.css` selectors renamed only | `SharedTheme.test.tsx` | Met (see F3 for T04) |

### T06 (PLAN refactor; role-aware-login R4)

| Criterion | Evidence | Result |
| --- | --- | --- |
| `canonicalizeEmail` and `emailKeyFor` moved to `server/auth/email.js` | Bodies identical to the removed `login.js` lines (trim + lowercase; `sha256`, UTF-8, hex) | Met |
| `login.js`, `register.js`, `firestore-registration.js` import from `./email` | diff lines `login.js:5`, `register.js:1`, `firestore-registration.js:3` | Met |
| Behaviour unchanged; existing email tests pass with import-path changes only | normalized diff of `login.credentials`, `login.session`, `firestore-mode.integration` tests shows import lines only; suites pass | Met |
| Key format | new `test/email.test.js` checks `/^[0-9a-f]{64}$/` and equality with `crypto` sha256; `login.js` re-exports the same function objects | Met |

## Test-rule check (existing tests)

I applied the rename mapping to each test file at `befe61e` and diffed the result against the staged file. The only non-rename differences are:

- `DashboardRoutes.integration.test.tsx`: one new `test.each` for the former paths (4 new `expect`s).
- `server.test.js`: one new loop for the former paths (3 new `expect`s).
- Three test files: import lines moved to `../server/auth/email` (T06).
- Local variable rename `librarianMarkup` → `taMarkup` in `SharedTheme.test.tsx`.

| File | `expect(` old → new | tests old → new |
| --- | --- | --- |
| DashboardRoutes.integration.test.tsx | 54 → 58 | 19 → 20 |
| server.test.js | 9 → 12 | 1 → 1 |
| SharedTheme, LoginPage, LoginPage.integration, MemberCatalogSearch, login.credentials, login.session, firestore-mode.integration | unchanged (23, 29, 40, 63, 36, 52, 6) | unchanged |

No assertion was removed or weakened. The heading regex `/librarian dashboard/i` became `/ta dashboard/i`. This is a shorter substring, but it does not match "Student Dashboard", and negative assertions become, if anything, stricter.

## Scope and deviations

These are recorded by the implementers and I accept them as in scope or necessary:

- CSS class, id, and prop renames (`student-*`, `ta-dashboard`, `studentNavigation`), plus the two `MemberCatalog.css` focus selectors. These are needed so the renamed classes keep their styles.
- The TA panel text ("TA workspace", "Welcome to your TA landing page."). The spec requires each view to identify its account type.
- The minimal compile edit to `MemberCatalogSearch.test.tsx`, which T04 deletes.
- `login.js` still re-exports the email helpers, because `LoginPage.integration.test.tsx` imports `emailKeyFor` from it. The re-export keeps the same function identity, which a test checks.
- Two new tests for the former paths, which provide the T03 matrix evidence.

No change touches session, CSRF, rate-limit, cookie, Argon2, or validation code. "LibConnect" text and `/api/member/catalog` remain, as T05 and T04 own them.

## Findings

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| F1 | Low (process) | `logs/tasks/codeclinic-rename/integration-G2.md` (untracked) | The integration log is not staged. A commit of only the index would lose the G2 integration evidence and token table. | Stage it before any approved commit. |
| F2 | Low (coverage) | `src/codeclinic/src/DashboardRouteGuard.tsx:48`; `test/DashboardRoutes.integration.test.tsx:219-228` | The fail-closed path for a 200 session body with a former or unknown role (`MEMBER`, `LIBRARIAN`, lowercase `student`) is correct by inspection, but untested. Only an empty body is tested. | Optional: add `MEMBER`/`LIBRARIAN` cases to the "fails closed with retry" table. |
| F3 | Low (follow-up for T04) | `src/codeclinic/src/MemberCatalog.css:248-249` | The only `:focus-visible` rules for the student navbar live in `MemberCatalog.css` (a pre-existing location). T04 deletes that file, which would drop the visible keyboard focus that R7 requires. | Tell T04 to move these rules into `DashboardViews.css` before deleting the file. |
| F4 | Info | `src/codeclinic/server/auth/login.js:315-316` | The email-helper re-export is kept for one `.tsx` test import (a recorded deviation). | Drop it once `LoginPage.integration.test.tsx` imports from `email.js` in a later task. |
| F5 | Info | `logs/tasks/codeclinic-rename/integration-G1.md` / G1 review F1 | G1 F1 (guard accepted only `MEMBER`/`LIBRARIAN`) is resolved by T03. | None. |

## Commands run

All commands ran from `src/codeclinic` (details in the log):

- `CI=true npm test -- --watch=false`: Test Suites 19 passed, 1 skipped (20). Tests 268 passed, 1 skipped (269).
- `npm run build`: compiled successfully.

## Not verified

- The opt-in Firestore emulator suite (`firestore-mode.integration.test.js`) was not run, so its changed import path was not executed. That run is T08 scope. The path was confirmed to resolve: `email.js` exists and exports `emailKeyFor`.
- I did not visually inspect the layout at 320 px or the focus states. The CSS change is selector renames only.

## Review-only tests

None added.
