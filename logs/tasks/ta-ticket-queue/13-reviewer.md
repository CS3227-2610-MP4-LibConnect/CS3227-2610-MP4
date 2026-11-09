# Reviewer log: ta-ticket-queue

- Model: claude-opus-5-5. Worktree: a detached clean checkout at `bd51540`.
  `git log -1` printed `bd51540 TA queue: Record implementation evidence`.
  `node_modules` is a shared symlink, so there was no install.
- Verified the version and approval-evidence lines in the spec (v0.1), the
  checklist (v0.1), and the handoff (v0.1). Read the coverage-report
  amendment.

1. Inspected the complete diff (`git diff --stat e3c03bc..bd51540`: 38 files,
   +1680/−4), every new server and UI module, and the dependent guards,
   notify, login, and route-guard code.
2. `git show 7ae376b` reorders `DETAIL_KEYS` only (same set).
   `git show bf2d1cd` adds 3 lines to the emulator test that activate the TA
   accounts and add a step label. Neither removes or relaxes an assertion.
3. Full suite at `bd51540`:
   `cd src/codeclinic && CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false < /dev/null`
   → `Test Suites: 4 skipped, 43 passed, 43 of 47 total`;
   `Tests: 4 skipped, 988 passed, 992 total`; exit 0.
4. Non-JSON body probe (a scratch Node script outside the repo, using the
   approved test harness and the in-memory store):
   - `text/plain` claim body `{"status":"RESOLVED","claimedByTaId":"x"}` → `200`, status `CLAIMED`.
   - Form body `status=RESOLVED` → `200`, status `CLAIMED`.
   - JSON `null` → `400` (rejected by the body parser).
   This is finding L1.
5. Cursor probe:
   `node -e` with `require('firebase-admin/firestore').Timestamp.fromMillis(1e20)` → throws `Error`;
   `decodeCursor` of `{createdAtMs:1e20,ticketId:'a/b'}` → accepted.
   This is finding L3.
6. Added the review-only tests `test/ta-ticket-queue.review.test.js` and
   `test/ta-ticket-queue.review.test.tsx`. Ran them:
   `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.review.test.*' --watchAll=false < /dev/null`
   → 2 suites passed, 19 tests passed.
7. Port check before the emulator run:
   `lsof -nP -iTCP:8080 -sTCP:LISTEN` → no output (port free). The
   `timeout` and `gtimeout` commands are absent, so the run used
   `perl -e 'alarm 300; exec @ARGV'` as the timeout.
8. Emulator suite (the T08 command, stdin from `/dev/null`):
   `CI=true RUN_FIRESTORE_EMULATOR_TESTS=1 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 CODECLINIC_FIRESTORE_MODE=local-emulator CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic perl -e 'alarm 300; exec @ARGV' firebase emulators:exec --only firestore --project demo-codeclinic "npm test -- --watch=false --runInBand --runTestsByPath test/ta-ticket-queue-emulator.integration.test.js" < /dev/null`
   → exit 0. `PASS test/ta-ticket-queue-emulator.integration.test.js`;
   `Tests: 1 passed, 1 total`; "Script exited successfully (code 0)";
   the emulators shut down.
   Port check afterwards: no listener on 8080. Removed the generated
   `src/codeclinic/firestore-debug.log`.
9. `npm run build < /dev/null` → `Compiled successfully.` It also printed a
   Node `DEP0176` deprecation warning (`fs.F_OK`) from the toolchain, which
   does not affect the build.
10. Full suite including the review tests (same command as step 3):
    `Test Suites: 4 skipped, 45 passed, 45 of 49 total`;
    `Tests: 4 skipped, 1007 passed, 1011 total`.
11. Created the branch `ta-ticket-queue-review` from `bd51540` and committed
    the review-only tests, `review-report.md`, `security-review.md`, and this
    log in one review commit. Nothing was pushed or merged.

No external services, production credentials, or secrets were used.

## Re-review (2026-11-09)

12. Created a fresh worktree with
    `git worktree add --detach <scratchpad>/wt/review2 ef05784` and
    symlinked the shared `node_modules`.
    - `git diff --stat 38d6f93..ef05784`: 7 files, +220/−22 (store.js,
      ta-claims.js, ta-routes.js, ta-views.js, the new
      ta-tickets.review-fixes.test.js, and the T03 evidence files).
    - `git show 1201090 -- workflow/specs`: an R1 clarification and an
      amendment entry.
    - `git diff --stat c49c539..ef05784 -- src/codeclinic/test`: only the
      new review-fixes test file (+156).
    - `git show 90effbe:src/codeclinic/firestore-debug.log`, grepped for
      `token|secret|password|key|cred|@|bearer|session|users/|email`: no
      matches. Grepped for `/Users|tickets/|demo-codeclinic/`: 0 matches.
      The content is emulator startup lines and "Transaction lock timeout"
      stack traces.
13. Full suite:
    `cd src/codeclinic && CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false < /dev/null`
    → `Test Suites: 4 skipped, 46 passed, 46 of 50 total`;
    `Tests: 4 skipped, 1025 passed, 1029 total`.
14. `lsof -nP -iTCP:8080 -sTCP:LISTEN` → no output. Then ran the emulator
    suite with the step-8 command (`perl -e 'alarm 300; exec @ARGV'`
    timeout, stdin from `/dev/null`) → exit 0.
    `PASS test/ta-ticket-queue-emulator.integration.test.js`;
    `Tests: 1 passed, 1 total`; "Script exited successfully (code 0)";
    the emulators shut down.
    Port 8080 check afterwards: no output. Removed the generated debug logs.
15. `npm run build < /dev/null` → `Compiled successfully.`
16. Code reading for N1: `src/TAQueuePage.tsx:127` renders
    `ticket.claimedByMe ? 'Claimed by you' : ticket.claimed ? 'Claimed' : null`.
    After F1, `claimedByMe` can be true on `RESOLVED` items.
17. Committed the three appended files on the new branch
    `ta-ticket-queue-review2` (from `ef05784`). Nothing was pushed or
    merged.
