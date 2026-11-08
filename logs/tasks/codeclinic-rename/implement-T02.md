# Execution log: codeclinic-rename T02

Date: 2026-11-08. Worktree branch `codeclinic-rename-t02`, `git log -1` = `2892dfe Rename app directory to src/codeclinic`. All commands run from `src/codeclinic/` unless noted.

1. `npm ci --no-audit --no-fund --cache "$TMPDIR/npm-cache-t02"`: completed (npm notice about a newer npm version only).
2. `CI=true npm test -- --watch=false --testPathPattern "LoginPage.test|RegistrationPage|RegistrationNavigation"`: PASS `RegistrationNavigation.test.tsx`, `LoginPage.test.tsx`, `RegistrationPage.test.tsx`. Test Suites: 3 passed, 3 total. Tests: 37 passed, 37 total.
3. `npm run build`: "Compiled successfully." (Node DEP0176 `fs.F_OK` deprecation warning from tooling only.)
4. `CI=true npm test -- --watch=false`: exit code 1. Test Suites: 1 failed, 1 skipped, 17 passed, 18 of 19 total. Tests: 5 failed, 1 skipped, 251 passed, 257 total.
   - FAIL `test/LoginPage.integration.test.tsx` (owned by T01, not edited), in suite "T05 React to Express login integration":
     - "uses server success, protected cookie session, CSRF logout, and then denies the invalidated session": no radio named `/librarian/i`.
     - "renders the same real-server denial for wrong selected type": no radio named `/librarian/i`.
     - "renders the same real-server denial for unknown account" and "… for wrong password": the message "Unable to sign in with those details." was not found. The page sends `STUDENT`, and the server, not yet changed by T01, rejects it as malformed.
     - "renders a generic 503 on repository failure and emits no authentication log data": `/temporarily unavailable/i` was not found, for the same reason.
   - Skipped: `test/firestore-mode.integration.test.js`, which is opt-in through `RUN_FIRESTORE_EMULATOR_TESTS=1`.
5. `git status --short` (worktree root): modified `src/LoginPage.tsx`, `src/RegistrationPage.tsx`, `test/LoginPage.test.tsx`, `test/RegistrationPage.test.tsx` under `src/codeclinic/`; plus these evidence files. Nothing committed.
