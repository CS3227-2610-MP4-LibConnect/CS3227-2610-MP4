# T03 factual execution log

Date: 2026-11-13. Working directory for npm and Firebase commands: `src/codeclinic`; repository root for other commands. No production or cloud project was used.

## Preflight

- `openspec list --json`: exit 0, `changes: []`, repository root detected. `openspec status --change student-playwright-e2e --json`: change not found. The repository's approved `workflow/specs/` adapter supplies canonical spec v0.1 and checklist/handoff v0.1; no second OpenSpec tree was created.
- Verified the human's Batch 2 approval in `approval-batch-2.md`, T03 in `tasks.md`, and the exact allowlist in `assignment-batch-2.json`.
- `firebase --version`: initially exited 1 with `EPERM` reading the user configstore path under the sandbox. Retried with `XDG_CONFIG_HOME` set to a disposable path in the workspace and `FIREBASE_CLI_DISABLE_USAGE_REPORTING=1`: exit 0, Firebase CLI 15.34.2. Removed the generated disposable config file after use.

## Checks

1. With `XDG_CONFIG_HOME` redirected and usage reporting disabled: `firebase emulators:start --only firestore --project demo-codeclinic` started the standard-edition Firestore emulator at `127.0.0.1:8080`; the CLI reported all emulators ready. It was stopped after verification; its generated `firestore-debug.log` was removed.
2. With `CODECLINIC_FIRESTORE_MODE=local-emulator`, `CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, and `GOOGLE_CLOUD_PROJECT=demo-codeclinic`: `npm run test:e2e` exited 0 unattended. Its build compiled successfully; Playwright ran 2 Chromium tests with 1 worker and reported `2 passed (18.1s)`. The core Student journey took 8.0s; the second Student ownership case took 4.5s. No test failed.
3. With `CI=true`: `npm test -- --watchAll=false --runInBand --runTestsByPath test/registration.api.test.js test/login.session.test.js test/student-tickets.api.test.js test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js test/StudentTickets.test.tsx test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx` exited 0: 8 suites passed, 219 tests passed, 0 snapshots, 39.738s. Existing React `act(...)` warnings appeared in `StudentTickets.test.tsx` and `StudentMyTickets.test.tsx`; no suite failed.
4. `npm run build` exited 0 and compiled successfully.
5. `git status --short`, scoped diff inspection, and `rg -n "trace:|screenshot:|video:" src/codeclinic/playwright.config.ts`: confirmed trace, screenshot, and video are `off`. The user's DG/UG edits and Batch 1 files were present before this item and were not edited. The T03 test change adds absence of attempted-fix text for the other Student and owner visibility of all description fields. No README change was needed.

The test outputs were observed directly in the command session. A separate verbatim console transcript was not captured; the exact command results and warnings above are retained here. Fresh `npm ci` was not run because it was optional and would replace the working dependency tree; the earlier lockfile concern remains for review.
