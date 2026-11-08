# Group 1 review — factual log

Date: 2026-11-08
Task ID: `codeclinic-rename`, Group 1 (T01, T02)
Worktree: branch `codeclinic-rename-g1`, base `2892dfe`

## Commands and results

1. `git status --short`, `git log --oneline -3`: HEAD `2892dfe`. 19 staged files (6 source, 11 test, 4 evidence), `LoginPage.integration.test.tsx` also modified in the working tree, and `integration-G1.md` untracked.
2. `git diff --cached` (source and test) and `git diff` (unstaged): the unstaged change is the two radio selectors `/librarian/i` → `/^ta$/i`.
3. `git diff --cached --numstat -- src/codeclinic/test`: 1:1 added/removed counts for every file except `login.credentials.test.js` (46/20).
4. Per-file assertion count (`grep -cE "expect\(|assert\."`), HEAD vs working tree: equal for all modified test files except `login.credentials.test.js` (29 → 36).
5. `grep -rnE 'MEMBER|LIBRARIAN|memberId|[Ll]ibrarian|isManager' server src scripts` (in `src/codeclinic`): the remaining former values are only in T03/T04 files (`DashboardRouteGuard.tsx`, `index.tsx`, `server/index.js` paths, `LibrarianDashboard.tsx`, `MemberCatalog.tsx`), the kept dashboard paths in `LoginPage.tsx:75`, and the intended `memberId` check in `login.js:58`.
6. `CI=true npm test -- --watch=false` (in `src/codeclinic`): exit 0. Test Suites: 1 skipped, 18 passed, 18 of 19 total. Tests: 1 skipped, 261 passed, 262 total. The skipped suite is the opt-in Firestore emulator test.
7. `npm run build` (in `src/codeclinic`): exit 0, the build folder is ready.
8. `git status --short` after the run: unchanged from step 1, apart from these review files.

There was no network access, no credentials were used, and nothing was committed, pushed, or edited outside the review files.
