# Review report: codeclinic-rename Group 1 (T01, T02)

Reviewer: independent `reviewer` agent (did not write this code)
Date: 2026-11-08
Worktree: integration worktree, branch `codeclinic-rename-g1`, base `2892dfe`; G1 changes staged but uncommitted, plus one unstaged integration fix
Inputs: `tasks.md` v0.1 and `handoff.md` v0.1 (human-approved 2026-11-08); Group 1 dispatch human-approved 2026-11-08; account-registration v0.7 (approved 2026-11-08); role-aware-login v0.3 (approved 2026-11-08)
Execution log: [`logs/tasks/codeclinic-rename/review-G1.md`](../../../logs/tasks/codeclinic-rename/review-G1.md)
Security review: [`security-review-G1.md`](security-review-G1.md)

This report is an assessment. It is not approval to merge or commit.

## Verdict recommendation

**Pass with follow-up (ready for the human merge decision into the task branch).** All T01 and T02 criteria are met and traced to passing tests. No security rule was loosened, and no existing assertion was removed or weakened. The follow-ups below are low-severity coverage gaps or process items, plus one medium interim-state risk that T03 (Group 2) resolves. Group 1 must not be released on its own.

## Findings (by severity)

| # | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| F1 | Medium (interim functional, not security) | `src/codeclinic/src/DashboardRouteGuard.tsx:5,48`; `src/index.tsx:22-23`; `src/LoginPage.tsx:75` | After G1, the server returns `STUDENT`/`TA`, but the dashboard guard still accepts only `MEMBER`/`LIBRARIAN`. A successful login therefore reaches a dashboard that shows an error. This fails closed. `DashboardRoutes.integration.test.tsx` still passes only because it mocks the old values. Already recorded by T01 and T02 as T03 scope. | Do not release G1 without G2/T03. T03 must update the guard and its mocked test values. |
| F2 | Low (process) | `src/codeclinic/test/LoginPage.integration.test.tsx:147,205` (unstaged); `logs/tasks/codeclinic-rename/integration-G1.md` (untracked) | The integration selector fix and the integration log are in the working tree but not in the index. A commit of only the index would leave 5 failing tests and lose the evidence. | Stage both before any approved commit. |
| F3 | Low (scope record) | `src/codeclinic/server/catalog/route.js:18`; `test/member-catalog.endpoint.test.js` | T01 also changed the catalog role check `MEMBER`→`STUDENT` and its test values. These files are not named in T01. The change is needed to keep the Student catalog working until T04 removes it, is listed in the report's changed-files table, and is not loosened (still exact-match, 403 otherwise). It is not recorded as a deviation. | Record it as a T01 deviation. No code change. |
| F4 | Low (coverage) | `test/registration.api.test.js:233` | Registration rejects the former `MEMBER`/`LIBRARIAN` request values (the code returns `null` → 400 for any value other than `STUDENT`/`TA`), but only `MANAGER` is tested. The persistence-layer `TypeError` for a former type (`server/auth/firestore-registration.js:15`) is also untested. | Optional: add 400 cases for `MEMBER`/`LIBRARIAN` at registration, as was done for login. |
| F5 | Low (coverage) | `server/auth/login.js:168-175` | A stored session with `accountTypeAtIssue: 'MEMBER'`/`'LIBRARIAN'` is rejected by the allowlist, but no test exercises it. T01 deviation 2 (the `memberId` check is not repeated in the session re-check) is acceptable, because a session can only be issued after a login that passed `isValidAccountRecord`. | Optional: add a legacy-session rejection test. |
| F6 | Low (coverage, pre-existing) | `src/LoginPage.tsx:90-94` | The login-page registration notice (including the new TA Coordinator wording) has no direct test. Only the registration page message and the stored key are tested. This gap predates G1. | Optional: add a LoginPage notice test (T05 touches the storage key anyway). |
| F7 | Info (evidence) | `logs/tasks/codeclinic-rename/integration-G1.md` token table | The T01 implementer run has no row in the subagent token table. | The orchestrator adds the T01 row (or marks it `unavailable`). |
| F8 | Info | `src/LoginPage.tsx:89`, `src/RegistrationPage.tsx:125`, `REGISTRATION_NOTICE_KEY` | "library account" intro text, `libconnect.registrationNotice`, and `__Host-libconnect_session` remain. These are T05 scope or unassigned wording, as reported by T02. | The orchestrator assigns the intro wording, for example to T05. |

No Critical or High findings.

## Acceptance-criteria trace

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| T01: register accepts only `STUDENT`/`TA`; TA inactive, `isManager=false` (AR R2, R4-R6) | `server/auth/register.js:17-36` | `registration.api`, `registration.endpoint` | Met |
| T01: persistence stores `STUDENT`/`TA`, `studentId`; re-derives type | `server/auth/firestore-registration.js:14-33` | `registration.api` (`studentId` = `userId`), `firestore-store`, `firestore-mode.integration` (opt-in, skipped) | Met (emulator test not run; T08) |
| T01: login request/record/session use `STUDENT`/`TA` (RAL R3-R4) | `server/auth/login.js:40,63,169,172,264` | `login.credentials`, `login.session`, `LoginPage.integration` | Met |
| T01: former `MEMBER`/`LIBRARIAN`/`memberId` records fail closed | `server/auth/login.js:57-58,63` | `login.credentials.test.js:210-225` (passwordMatched false, 401, no cookie, no session); `:227-233` (400 for former request values) | Met |
| T02: Student/TA choices, labels, request values (AR R2; RAL R1-R2) | `src/RegistrationPage.tsx:137-143`, `src/LoginPage.tsx:97-121` | `RegistrationPage.test`, `LoginPage.test` (accessible names `Student`/`TA`, POST body values) | Met |
| T02: TA Coordinator wording, pre-submission note, no coordinator/manager choice (AR R2, R7) | `src/RegistrationPage.tsx:129,146`, `src/LoginPage.tsx:93` | `RegistrationPage.test.tsx:38,47,216` | Met (login-page notice untested, F6) |
| T02: client validation unchanged (AR R3) | `src/RegistrationPage.tsx` (values only) | validation tests unchanged apart from renames | Met |
| Full suite and build | — | 18 suites passed, 1 skipped; 261 passed, 1 skipped; build compiled | Met |

## Test-rule check (handoff *Test rules*)

The reviewer compared each modified test file at `2892dfe` with the staged and working-tree versions.

- Assertion counts (`expect(`/`assert.`) are equal old vs new in every file except `login.credentials.test.js` (29 → 36, the new fail-closed tests). Line changes are 1:1 in every other file.
- All changes are value, label, title, or variable renames. Leak-check regexes changed `MEMBER` → `STUDENT`, which keeps the check on the value that is now returned. The forged-ID case changed `memberId: 'attacker'` → `studentId: 'attacker'`, still a forged-ID rejection test.
- `/coordinator|manager/i` (`RegistrationPage.test.tsx:38`) is a negative `queryByRole` check. Widening it makes it stricter; not weakened.
- `/^ta$/i` (`LoginPage.test.tsx:56,64`, `RegistrationPage.test.tsx`, `LoginPage.integration.test.tsx:147,205`) is an exact-name match. A substring `/ta/i` would be ambiguous. The exact accessible-name assertion `toHaveAccessibleName('TA')` is kept, so the selector is narrower and not weakened.
- The `LoginPage.test.tsx` dashboard destinations `/member/dashboard` and `/librarian/dashboard` are unchanged by design (T02 deviation 1, for T03).
- No test was deleted, skipped, or weakened.

## Scope and deviations

- Changed files are all under `src/codeclinic/` plus evidence files. There are no dependency, lockfile, CI, or configuration changes, and nothing outside the handoff's allowed files. The catalog edit is noted in F3.
- Deviations are recorded: the T01 fast-forward of its worktree from `0d26cd6` to `2892dfe` (the integration branch is based on `2892dfe` directly, so it does not affect this diff); the T01 `memberId` check is in the login check only; T02 keeps the dashboard paths for T03; T02's selector changes; the integration selector fix (in `integration-G1.md`).

## Not verified

- The opt-in Firestore emulator test (`firestore-mode.integration.test.js`) was skipped, as by default. It is planned for T08.
- No review-only tests were added.
