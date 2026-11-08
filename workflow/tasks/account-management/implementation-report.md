# Implementation report: account management continuation (T02, T03, T04, T05, T06, T07)

Status: implemented and independently reviewed; R7 High finding fixed under human approval and independently rechecked. Human commit/merge decision pending.

Specification: `workflow/specs/account-management.md` v0.1, human-approved 2026-11-08. Checklist and handoff: v0.1, human-approved 2026-11-08. Dispatch: approved back-to-back team feature schedule and standing dispatch approval recorded in `tasks.md`.

Skills: `openspec-apply-change` using the repository's `workflow/specs/` path adapter, and `firebase-firestore` as the transaction reference. The OpenSpec CLI was unavailable; no separate OpenSpec tree was created. No cloud database was inspected or modified.

Execution log: [`logs/tasks/account-management/continuation.md`](../../../logs/tasks/account-management/continuation.md). Security self-check: [`security-review-continuation.md`](security-review-continuation.md). Proposed guide text: [`guides-proposed.md`](guides-proposed.md).

## Implemented scope

| Task | Result |
| --- | --- |
| T02 — Self-service API | Added own account read, profile update and password change endpoints. Profile fields follow registration bounds and email rules; email changes require the current password and use the AM-G1 transaction. Wrong current passwords consume the shared login email failure counter; successful changes preserve the current session, delete other sessions, and clear the forced-change flag. |
| T03 — Support API | Added paginated support list, status update and temporary password reset. The AM-G1 active-session/CSRF/target guards enforce the stored role matrix. Deactivation and reset use AM-G1 transactional session deletion. Reset uses 16 characters from the unambiguous alphabet via `crypto.randomInt`, returns once with `Cache-Control: no-store`, and stores only an Argon2id hash. |
| T04 — Forced password change | Added the R7 allow-list middleware in `server/auth/login.js`, before routers mounted by the app. Temporary-password sessions may call only session, CSRF, logout and account-password endpoints; other API requests return `403 PASSWORD_CHANGE_REQUIRED`. Session responses include `mustChangePassword` only when true, preserving ordinary-session response shape. |
| T05 — Bootstrap | Added `scripts/bootstrap-coordinator.js`. It requires `--project`, resolves the email through canonical `emailKeys`, verifies the stored target is a TA, refuses an existing Coordinator unless `--allow-additional` is supplied, and prints only generic outcome text. The CLI was not run against any project. |
| T06 — Pages | Added Account, Students, TAs and forced password-change pages, confirmations, one-time password display/copy/hide, loading/error retry states, responsive shared navigation, and notification navigation. The orchestrator mounted API and SPA routes and integrated the guides in its owned files. |
| T07 — Evidence and guidance | Added this report, factual log, account security self-check, proposed accurate guide text, component/API/bootstrap tests, and an opt-in emulator integration test. The orchestrator updated the published guides and captured the shared navigation viewport evidence. |

## Changed files

Implementer-owned source/tests: `src/codeclinic/server/account/routes.js`, `src/codeclinic/server/auth/login.js`, `src/codeclinic/scripts/bootstrap-coordinator.js`, `src/codeclinic/src/AccountPages.tsx`, `src/codeclinic/src/AccountPages.css`, `src/codeclinic/src/NotificationsRoute.tsx`, `src/codeclinic/src/DashboardLogout.tsx`, `src/codeclinic/src/DashboardRouteGuard.tsx`, `src/codeclinic/src/TADashboard.tsx`, `src/codeclinic/src/index.tsx`, `src/codeclinic/test/account-routes.test.js`, `src/codeclinic/test/account-r7-server.test.js`, `src/codeclinic/test/account-emulator.integration.test.js`, `src/codeclinic/test/bootstrap-coordinator.test.js`, and `src/codeclinic/test/AccountPages.test.tsx`.

Orchestrator-owned integration includes `src/codeclinic/server/index.js` mounting the account router, SPA route serving, guide edits, and approved compatibility fixture updates. The source startup wiring mounts `createAccountRouter({ accountStore: createFirestoreAccountStore(db, authStore), authStore, loginRepository })` at `/api`.

## Acceptance status and verification

T02–T06 implementation criteria are implemented. Existing AM-G1 tests cover the complete stored-role support matrix. New fake-based tests cover profile field rejection, current-password rate-limit interaction, session retention, temporary-password construction, forced access, bootstrap refusal/promotion, and UI confirmations/loading/error behavior.

- Final orchestrator integrated run: `CI=true npm test -- --watch=false --runInBand` — exit 0; 36 suites passed, 637 tests passed, 3 opt-in suites skipped (640 total). Raw output: [`logs/tasks/account-management/verification/regression.log`](../../../logs/tasks/account-management/verification/regression.log).
- Latest focused run: `CI=true npm test -- --watch=false --runInBand test/AccountPages.test.tsx test/bootstrap-coordinator.test.js test/account-emulator.integration.test.js` — 2 suites passed, 10 tests passed; the emulator suite skipped because `RUN_FIRESTORE_EMULATOR_TESTS` was not enabled in this local invocation.
- Latest `npm run build` — exit 0, compiled successfully. Raw output: [`logs/tasks/account-management/verification/build.log`](../../../logs/tasks/account-management/verification/build.log).
- New `account-emulator.integration.test.js` — opt-in emulator run passed with existing auth and AI gateway emulator suites: 3 suites and 3 tests passed in 9.043 seconds. Synthetic account records are seeded through the existing Firestore registration persistence adapter to avoid exhausting the shared registration-source limit; registration rate limiting remains covered by existing registration/auth tests. The account API, logins, status/reset actions, forced password change, and email operations remain end-to-end. It covers Coordinator promotion/refusals, session deletion on deactivation/reset, R7 forced change and session retention, and email-key movement/collision. Raw output: [`logs/tasks/account-management/verification/emulator.log`](../../../logs/tasks/account-management/verification/emulator.log).
- Browser preview at 320 CSS pixels: orchestrator measured `document.scrollWidth=320px`; evidence is under `logs/tasks/account-management/visual/`.

## Deviations and unresolved risks

- The bootstrap CLI itself was not executed against Firebase; bootstrap behavior was tested through the exported function and fakes. The opt-in emulator test exercised the same promotion/refusal function without executing the CLI.
- No independent review has occurred yet. The security continuation is an implementer self-check and does not replace independent security review.
- No changes were made to the approved spec/checklist. No credentials, actual account records, hashes, temporary passwords, or session identifiers were placed in reports or factual logs.

## Subagent token usage

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer subagent | Account-management T02/T03/T04/T05/T06/T07, run 1 | unavailable | unavailable | unavailable | unavailable | Runtime metrics unavailable to this subagent |

## Final independent review and verification

Independent verdict: **Pass after the approved R7 fix**. The original High
finding is retained in review-report.md and security-review.md as resolved.
The independent recheck passed nine R7 tests and the adversarial path probe.
Final full regression passed 645 tests in 36 suites; three default-skipped
opt-in integrations passed separately against a fresh local emulator. Build
compiled successfully. Exact output and chronology are retained in
logs/tasks/account-management/verification/ and continuation.md.
No commit, merge, push, cloud bootstrap or deployment was performed.

### Continuation runtime usage detail

| Role | Task/run | Configured model | Input tokens | Output tokens | Total tokens | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Implementer | account continuation, run 1 | gpt-6-luna | unavailable | unavailable | unavailable | Runtime metrics unavailable |
| Reviewer | account and security correction, run 1 | gpt-6-luna | unavailable | unavailable | unavailable | Runtime metrics unavailable |

Configured model is the explicit profile setting; actual runtime model telemetry
and aggregate token usage are unavailable. Root integration work is not a subagent.
