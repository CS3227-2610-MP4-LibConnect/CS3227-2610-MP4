# T01 independent review execution log

Date: 2026-11-09 (Asia/Singapore)  
Task: `student-tickets`, Batch 1, T01  
Reviewed specification/checklist/handoff: v0.3 / v0.2 / v0.2

## Files and artifacts reviewed

- `AGENTS.md`, `workflow/README.md`, `workflow/agents/reviewer.toml`
- `workflow/specs/student-tickets.md`
- `workflow/tasks/student-tickets/tasks.md`, `handoff.md`, `assignment-batch-1.json`, `batch-plan.md`, `implementation-T01.md`
- `logs/tasks/student-tickets/implementation-T01.md`
- `src/codeclinic/server/index.js`, `server/tickets/route.js`, `store.js`, `validation.js`
- `src/codeclinic/test/student-tickets.api.test.js`, `student-tickets.storage.test.js`
- Relevant auth/session and server wiring code, including `src/codeclinic/server/auth/login.js`

## Commands and results

1. From `src/codeclinic`:

   `npm test -- --runInBand --watchAll=false --silent student-tickets.api student-tickets.storage`

   **Passed:** 2 suites, 41 tests. Jest emitted the existing Node `punycode` deprecation warning.

2. From `src/codeclinic`:

   `npm test -- --runInBand --watchAll=false --silent server.test login.session account-server-wiring login.credentials account-routes`

   **Passed:** 6 suites, 68 tests. The matched suites include `account-r7-server.test.js`; existing login/account parser and server wiring regressions passed. Jest emitted the existing Node `punycode` deprecation warning.

3. From repository root:

   `git diff --check`

   **Passed:** no whitespace errors. Git reported a line-ending normalization warning for `src/codeclinic/server/index.js` (LF will be replaced with CRLF on a later Git write); no whitespace defect was reported.

4. From `src/codeclinic`:

   `npm ls firebase-admin @google-cloud/firestore --depth=1`

   **Passed:** `firebase-admin@14.5.0` resolves `@google-cloud/firestore@9.4.0` as its dependency; this confirms the current installed runtime can resolve the Timestamp import, but does not make it a direct package declaration.

## Review result

Verdict: **pass with follow-up**. One LOW finding concerns UTF-16 code-unit counting for filename, repository URL, and aggregate repository path limits. See `workflow/tasks/student-tickets/review-T01.md` for evidence and recommendation.

The assigned clean review checkout was at the baseline commit, while implementation files were uncommitted/untracked in the shared workspace. I recorded this exception and compensating controls in the report. No production files, checklist, or manifest were modified. No review-only tests were added. No emulator, production data, credentials, network service, or external action was used.

## Correction re-review — 2026-11-09

Reviewed the human-approved T01 Unicode correction in `src/codeclinic/server/tickets/validation.js` and its boundary coverage in `src/codeclinic/test/student-tickets.api.test.js`, against spec v0.3 and checklist v0.2.

1. From `src/codeclinic`:

   `npm test -- --runInBand --watchAll=false --silent student-tickets.api student-tickets.storage`

   **Passed:** 2 suites, 45 tests. Jest emitted the existing Node `punycode` deprecation warning. The suite covers accepting exactly 120 supplementary Unicode filename characters, 255 repository URL characters, and 5,000 aggregate path characters; and rejects 121, 256, and 5,001 respectively.

2. From repository root:

   `git diff --check`

   **Passed:** no whitespace errors. Git retained the existing line-ending normalization warning for `src/codeclinic/server/index.js`.

Result: the original LOW finding is resolved. No new finding. Revised T01 verdict: **pass**. No production, checklist, or manifest edits were made by the reviewer; no review-only tests were added. The separate-checkout limitation remains as described in the original report.
