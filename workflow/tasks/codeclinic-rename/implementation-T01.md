# Implementation report: codeclinic-rename T01

Task: `codeclinic-rename`, checklist item **T01 — Server account types and identifiers** (Group 1)
Status: complete for T01 scope; one cross-task test dependency on T02 (see Risks)
Date: 2026-11-08
Execution log: [`logs/tasks/codeclinic-rename/implement-T01.md`](../../../logs/tasks/codeclinic-rename/implement-T01.md)

## Inputs verified

- `spec.md` (task reference), `tasks.md` v0.1 and `handoff.md` v0.1: human-approved 2026-11-08; grouping and Group 1 dispatch human-approved 2026-11-08.
- `workflow/specs/account-registration.md` v0.7 (approved 2026-11-08): R2, R4–R6 and the v0.7 amendment (former values fail closed, no migration).
- `workflow/specs/role-aware-login.md` v0.3 (approved 2026-11-08): R3, R4.
- Skill: `openspec-apply-change` preflight, path-adapted to `workflow/specs/` and `workflow/tasks/`.

## Changed files (uncommitted, under `src/codeclinic/`)

| File | Change |
| --- | --- |
| `server/auth/register.js` | Accepts `STUDENT`/`TA` only; local `librarian` flag renamed `isTa` |
| `server/auth/firestore-registration.js` | Stores `STUDENT`/`TA` and `studentId`; local flag renamed; comment wording |
| `server/auth/login.js` | Request, record, and session checks use `STUDENT`/`TA`; session `name` for `STUDENT`; a stored record containing `memberId` is malformed |
| `server/catalog/route.js` | Role value `MEMBER` → `STUDENT` only (catalog removed later in T04) |
| `test/login.credentials.test.js` | Values renamed; new fail-closed tests (below) |
| `test/login.session.test.js`, `test/registration.api.test.js`, `test/registration.endpoint.test.js`, `test/firestore-store.test.js`, `test/server.test.js`, `test/LoginPage.integration.test.tsx`, `test/firestore-mode.integration.test.js`, `test/member-catalog.endpoint.test.js` | Role values and `memberId` → `studentId` only |

Existing test edits are 1:1 line substitutions (equal added/removed line counts per file). No assertion was removed or weakened. Response-leak regexes now check for `STUDENT` instead of `MEMBER`.

New tests in `test/login.credentials.test.js`:

- A stored record with `accountType: 'MEMBER'`, `accountType: 'LIBRARIAN'`, or a `memberId` field returns `passwordMatched: false`, HTTP `401` with the generic denial, no cookie, and no session.
- A login request with `accountType` `MEMBER` or `LIBRARIAN` returns `400` before any repository access.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Registration accepts and stores `STUDENT`/`TA`, `studentId` (account-registration R2, R4–R6) | Met | `registration.api`, `registration.endpoint` pass |
| Login validates `STUDENT`/`TA` and the stored type (role-aware-login R3–R4) | Met | `login.credentials`, `login.session` pass |
| Records with former values fail closed as malformed | Met | New tests in `login.credentials` pass |
| Full suite green | Met only after T02 merges | 256 pass, 5 fail (all in `LoginPage.integration`), 1 skipped; see Risks |
| Build | Met | `npm run build` succeeded |

## Deviations

1. The worktree was created at `0d26cd6` (main), not `2892dfe`. The tree was clean, and `2892dfe` descends directly from `0d26cd6`, so I fast-forwarded the local worktree branch (`git merge --ff-only 2892dfe`). No other git operations were run.
2. The `memberId` fail-closed check was added only to the login record check (`isValidAccountRecord`), not to the per-request session re-check. Sessions can only be issued after a login that passed this check.
3. The report is named `implementation-T01.md` as the orchestrator assigned, not `implementation-report.md`.

## Risks and items for the orchestrator

- **T01/T02 coupling in `LoginPage.integration.test.tsx`:** this test renders the real `LoginPage.tsx` (owned by T02), which in this worktree still sends `MEMBER`/`LIBRARIAN`. The T01 server now returns `400` for those values, so 5 of 6 tests fail here. With a temporary values-only change to `LoginPage.tsx` (restored with `git checkout`, so it is not in the diff), all 6 pass. At merge, the test's radio query `{ name: /librarian/i }` (a label) must match T02's new TA label. The `'/librarian/dashboard'` destination is a route left for T03.
- **Interim frontend state:** until T02 and T03 merge, `LoginPage.tsx` and `DashboardRouteGuard.tsx` reject the server's `STUDENT`/`TA` responses. `DashboardRoutes.integration.test.tsx` passes only because it mocks fetch with the old values. Those files belong to T02/T03.
- The opt-in emulator test `firestore-mode.integration.test.js` was skipped (it is not run by default). Only a syntax check was done; T08 runs it.
- Test titles and variable names (`member`, `librarian`, `'member selected as librarian'`) and the email `MEMBER@EXAMPLE.TEST` were kept as they were, because the brief allowed renaming values only.

## Orchestrator note (2026-11-08)

Review finding F3: T01 also changed the role check in `server/catalog/route.js` and the forged-role value in `test/member-catalog.endpoint.test.js` to `STUDENT`. This was needed to keep the suite passing until T04 removes the catalog, and it loosens nothing. It is recorded here as a deviation from the T01 file list.
