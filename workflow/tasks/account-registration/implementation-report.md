# Account registration implementation report

Task ID: `account-registration`  
Contract: approved `workflow/specs/account-registration.md` v0.4, `tasks.md` v0.3, and `handoff.md` v0.3  
Implementation grouping: Groups 1–4 approved on 2026-11-06; Group 5 approved on 2026-11-07  
Status: T01–T06 implemented and independently reviewed; exact-commit review and human merge decision pending

## Changes

- T01: `src/libconnect-mp4/src/index.tsx`, `src/libconnect-mp4/src/LoginPage.tsx`, `src/libconnect-mp4/src/RegistrationPage.tsx`, and `src/libconnect-mp4/server/index.js` add Register navigation, `/register`, and direct-route fallback. Focused navigation tests were added.
- T02: `RegistrationPage.tsx` and `test/RegistrationPage.test.tsx` add the account-specific form, approved bounds, accessible validation, allowed request payload, and pending guard.
- T03: `server/auth/register.js`, `server/index.js`, and `test/registration.endpoint.test.js` add the bounded API, server-controlled status, source limit, generic errors, and a persistence seam.
- T04: `server/auth/firestore-registration.js`, `server/index.js`, and `test/registration.api.test.js` add transactional `users`/`emailKeys` creation, Argon2id hashing, and collision handling.
- T05: `RegistrationPage.tsx`, `LoginPage.tsx`, and related tests add type-specific success, five-second redirect, retained login notice, and synthetic register-to-login checks. `test/server.test.js` received a transaction-capable fixture seam update.
- T06: `server/firestore-target.js`, `server/index.js`, `package.json`, `README.md`, and two focused tests add explicit emulator and production Firestore modes. Local startup pins `127.0.0.1:8080` and project `libconnect-mp4`, uses a synthetic local credential, and fails before listening if the emulator is unavailable. Production startup requires an explicit project, matching Cloud Run metadata project, and runtime credentials; it rejects emulator settings and well-known developer ADC files. The separately approved `package.json` proxy forwards React development requests to local Express.
- At the user's later requests, `docs/DeveloperGuide.md` now documents the three-process local development startup with an `.env` file, plus production environment variables, build/start commands, Cloud Run identity requirements, and unverified deployment prerequisites. This documentation-only addition was outside the original Group 5 file list and was directly authorized by the user.

The exact per-task file lists, commands, results, and decisions are in `implementation-T01.md` through `implementation-T06.md` and `logs/tasks/account-registration/`.

## T07 implementation handoff (2026-11-07)

Contract: human-approved `workflow/specs/account-registration.md` v0.5, `tasks.md` v0.4, and `handoff.md` v0.4; the orchestrator received separate human approval for Group 6 and the T07 tests before implementation. Status: implemented, awaiting independent review; the orchestrator owns checklist reconciliation.

The T07 source changes are limited to `src/libconnect-mp4/src/RegistrationPage.tsx` and `src/libconnect-mp4/server/auth/register.js`. Both validate the trimmed address with the R9 syntax. The client shows a linked, accessible email error without a request; the endpoint returns `400` before rate reservation or persistence. Existing original-case storage, lowercase key, and login policy remain in place. The separate test writer authored the T07 tests; this implementer did not edit them. No new dependencies or config changes were made for T07.

Targeted Jest passed: 3 suites, 144 tests. `npm run build` and scoped `git diff --check` passed. Full Jest: 10 suites passed, 1 failed, 1 skipped; 226 tests passed, 3 failed, 1 skipped. The three failures are in `firestore-target.test.js` production-mode cases, and repeat when that file runs alone (18 passed, 3 failed). React Scripts loads a local environment file that defines `FIRESTORE_EMULATOR_HOST`; production-target tests require that variable to be absent. The pre-React-Scripts shell did not define it. The implementer did not inspect environment values or credential contents, edit the environment file or out-of-scope tests, or change Firestore code. See `logs/tasks/account-registration/implement-T07.md` for exact commands and results. R9 scenario 18 has targeted test evidence; full-suite verification remains limited by the environment-file/test isolation issue. No live Firebase access, commit, stage, merge, or deployment occurred.

## Verification and review

- T01 focused Jest: 3 suites, 17 tests passed; TypeScript and `node --check` passed.
- T02 focused Jest: 1 suite, 13 tests passed; TypeScript passed.
- T03 focused Jest: 25 tests passed; syntax and diff checks passed.
- T04 focused Jest: 2 suites, 54 tests passed; syntax and diff checks passed.
- T05 final full Jest: 10 suites, 136 tests passed; TypeScript and production build passed.
- Independent reviewer reran full Jest (10 suites, 136 tests) and TypeScript: both passed. `review-report.md` concludes **pass with follow-up**; `security-review.md` records the authorization and transaction assessment. The reviewer inspected tracked and untracked changes in the current worktree because no implementation commit exists for a separate checkout.
- After review, the orchestrator marked T01–T05 `[x]` in `tasks.md`. This records independent verification, not human merge approval.
- T06 full Jest: 11 suites, 157 tests passed; TypeScript and build passed. The real Firestore emulator register-to-login test passed with synthetic accounts and invalid ambient cloud credentials. A React development proxy smoke test returned Express JSON through port 3001. The independent reviewer found and then verified a fix for developer ADC precedence in production mode. The corrected review verdict is **pass with follow-up**; after that review, the orchestrator marked T06 `[x]`.
- The developer-guide edit was checked with `git diff --check -- docs/DeveloperGuide.md`; it passed with only a line-ending warning. It changes documentation only and has not yet been included in an exact-commit review.

## Remaining risks and decisions

- Unit tests use a synthetic Firestore transaction fake; one registration-to-login flow passed on the local emulator. Real contention, production IAM/rules, reverse-proxy source identity, and deployed `/register` routing remain unverified and require separately authorized environment checks before release.
- The approved specification does not define email syntax beyond required string and byte limits. Review found that invalid-looking addresses can pass. A stricter format requires a specification decision before code changes.
- A prior successful registration notice can remain in session storage if a visitor starts another registration attempt before visiting login. It is display-only and does not affect authorization; review recommends clearing it on a new attempt if the notice should represent only the latest attempt.
- `registrationDateTime` is a server-created JavaScript `Date` set before the transaction commits. It satisfies the approved server-generated timestamp wording but can precede a delayed commit.

No live production Firebase project was accessed; no dependencies, Firestore rules, CI/deployment configuration, push, commit, or merge were changed. Production credential validity and IAM remain deployment gates. The human must decide whether to accept these follow-ups and the proposed commit message before commit; exact-commit review and a separate merge decision follow.

## Final T07 and reopened T06 reconciliation — 2026-11-07

The historical T07 implementation note above records the initial full-suite failure. Independent T07 review passed R9/scenario 18: 144 targeted registration tests and the build passed. Its temporary isolated full run passed 229 regular tests; the reviewer traced the three ordinary failures to T06 test harness contamination from a local `.env` emulator variable, not T07 production code. The orchestrator reopened T06 under the repository failed-check rule and informed the human.

After human approval of a test-only T06 correction, `test/firestore-target.test.js` now removes the ambient `FIRESTORE_EMULATOR_HOST` before each case, restores its original value after each case, and explicitly tests production rejection when that variable is set. The implementer changed no production code or configuration. Independent re-review passed: the ordinary focused target suite passed 22/22 and the ordinary full suite passed 230 regular tests across 11 suites, with the opt-in emulator test skipped. The previous T07 build passed; no build input changed in the T06 correction. The orchestrator restored T06 to `[x]`; T07 is `[x]` after its independent review. The approved email-format rule resolves the earlier email-syntax follow-up.

The implementation remains uncommitted. Live production IAM/credentials, rules, deployment routing, and the exact future commit review remain outside local verification; the display-only success marker and persistent emulator rate-counter follow-ups remain recorded in the independent review. No `.env` content was read or included in evidence.
