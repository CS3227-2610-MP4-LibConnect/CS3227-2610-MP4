# Implementation report: T02 — Registration and login pages

Task ID: `codeclinic-rename`, checklist item T02 (Group 1)
Status: complete, awaiting independent review (uncommitted on branch `codeclinic-rename-t02`, base `2892dfe`)
Specifications: account-registration v0.7 (R2, R3, R7); role-aware-login v0.3 (R1, R2). Checklist v0.1 and handoff v0.1 human-approved 2026-11-08; Group 1 dispatch human-approved 2026-11-08 (per `tasks.md`).
Skill: `openspec-apply-change` preflight, path-adapted to `workflow/specs/` and `workflow/tasks/`.
Execution log: [`logs/tasks/codeclinic-rename/implement-T02.md`](../../../logs/tasks/codeclinic-rename/implement-T02.md)

## Changed files

All under `src/codeclinic/`:

- `src/LoginPage.tsx`: account type `STUDENT | TA`; radio values, labels (Student, TA) and option icons (S, T); registration-notice values; returned-type check; notice messages.
- `src/RegistrationPage.tsx`: account type `STUDENT | TA`; choices and labels; stale employee ID cleared on Student; `employeeId` sent only for TA; expected status per type; TA pre-submission note and success message name the TA Coordinator.
- `test/LoginPage.test.tsx`, `test/RegistrationPage.test.tsx`: values, labels, test titles and local variable names renamed only.

`test/RegistrationNavigation.test.tsx` has no role labels and is unchanged.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| account-registration R2: Student/TA choice, employee ID only for TA, no coordinator/manager choice, TA activation note | Met | `RegistrationPage.test.tsx` passes |
| account-registration R3: client validation unchanged | Met | Validation tests pass unchanged apart from renames |
| account-registration R7: type-specific success message, TA Coordinator activation wording, login notice | Met | Success and notice tests pass |
| role-aware-login R1–R2: Student/TA radio group, `STUDENT`/`TA` request values | Met | `LoginPage.test.tsx` passes |
| T02 page tests (handoff test matrix) | Met | 3 suites, 37 tests pass |
| `npm run build` | Pass | "Compiled successfully." |

## Deviations

1. **Dashboard paths kept (for T03).** The login page still sends `STUDENT` to `/member/dashboard` and `TA` to `/librarian/dashboard`, and `LoginPage.test.tsx` still expects those paths. T03 must change both to `/student/dashboard` and `/ta/dashboard`.
2. **Stronger manager-choice check.** The assertion `queryByRole('radio', { name: /manager/i })` is now `/coordinator|manager/i`. It still checks the former name and adds the new one, so the check is not weakened.
3. **Exact TA label matcher.** Tests match the TA radio and label with `/^ta$/i` rather than `/ta/i`, because a bare `/ta/i` could match other text on the page.

## Unresolved risks and follow-ups

- **Integration test fails until T01 merges.** `test/LoginPage.integration.test.tsx`, owned by T01, has 5 failures in this worktree, because:
  - it still clicks a `/librarian/i` radio;
  - the page now sends `STUDENT`/`TA` to a server that still accepts only `MEMBER`/`LIBRARIAN`, so the server returns `400` where the test expects `401`/`503`.

  No server file or T01 test was edited. Rerun the full suite once T01 and T02 are both merged.
- **Out-of-scope text left for T05:**
  - storage key `libconnect.registrationNotice`;
  - the "LIBCONNECT" eyebrow;
  - the "L" brand mark.
- **Untracked wording for a later task.** The intro text "Sign in to continue to your library account." and "Create your library account." still use library wording. They are not role labels, and no checklist item names them; the orchestrator should give them to T05 or another task.
