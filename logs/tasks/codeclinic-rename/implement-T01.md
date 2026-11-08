# T01 implementation — factual log

Date: 2026-11-08
Task ID: `codeclinic-rename`, item T01
Worktree: `.claude/worktrees/agent-a44f838746b0c67b2`, branch `worktree-agent-a44f838746b0c67b2`

## Commands and results

1. `git log -1 --oneline` → `0d26cd6 Update overview` (expected `2892dfe`). `workflow/tasks/codeclinic-rename/` was absent.
2. `git merge-base --is-ancestor 0d26cd6 2892dfe` → true. `git merge --ff-only 2892dfe` → fast-forward; HEAD `2892dfe Rename app directory to src/codeclinic`. The working tree was clean beforehand.
3. Read the role profile, `AGENTS.md`, `workflow/README.md`, `spec.md`, `tasks.md` v0.1, `handoff.md` v0.1, account-registration v0.7, and role-aware-login v0.3. All have recorded human approval.
4. `npm ci --no-audit --no-fund --cache $TMPDIR/npm-cache-t01` (run from `src/codeclinic`) → `added 1603 packages in 36s`. There were deprecation warnings only, and no lockfile change.
5. Values were renamed with `perl -pi` (quoted `'MEMBER'`→`'STUDENT'`, `'LIBRARIAN'`→`'TA'`, `memberId`→`studentId`) in the files listed in the report. Two leak-check regexes were updated, and the `memberId` check was added with an edit.
6. `CI=true npm test -- --watch=false` → Test Suites: 1 failed, 1 skipped, 17 passed (18 of 19). Tests: 5 failed, 1 skipped, 256 passed (262). All 5 failures are in `test/LoginPage.integration.test.tsx`; for example, the expected `/librarian/dashboard` assign was never called because `LoginPage.tsx` still sends `LIBRARIAN`.
7. Verification only: I temporarily applied the values-only rename to `src/LoginPage.tsx`, then ran `npx react-scripts test ... test/LoginPage.integration` → 6 passed, 6 total. I restored the file with `git checkout -- src/LoginPage.tsx`, and `git status` showed it clean.
8. `npm run build` → "The build folder is ready to be deployed."
9. `node --check test/firestore-mode.integration.test.js` → OK. The opt-in emulator test was not run.
10. `git diff --numstat` → each existing test file has equal added and removed line counts. `login.credentials.test.js` has 46 added and 20 removed lines, which includes the new tests.

No network access beyond `npm ci` from the lockfile. No credentials were used. Nothing was committed or pushed.
