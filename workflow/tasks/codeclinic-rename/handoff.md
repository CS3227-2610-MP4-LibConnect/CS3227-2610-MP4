# Analyst handoff: CodeClinic rename

Handoff version: 0.1 (2026-11-08)
Task ID: `codeclinic-rename` (human-confirmed 2026-11-08)
Specifications: listed with versions in `workflow/tasks/codeclinic-rename/spec.md`
Checklist: `workflow/tasks/codeclinic-rename/tasks.md`, version 0.1 (human-approved 2026-11-08)
Handoff approval evidence: the human replied "approvrf" (approved) to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

`workflow/templates/handoff.md` is absent. This handoff follows the required fields in `workflow/README.md`.

## Scope

Implement T01–T08:

- Rename the roles, routes, and dashboard modules.
- Remove the retired Book catalog.
- Rename every internal and user-visible LibConnect name.
- Move the email helpers into their own module.
- Update the User Guide and Developer Guide.

No new feature, API, data field, or rule is in scope. The ticket features, AI features, and deployment configuration beyond the variable rename are excluded.

## Implementation preflight

- Read `AGENTS.md`, `workflow/README.md`, every specification listed in `spec.md`, this handoff, and the checklist from disk. Verify the versions and approval states, and stop if any is missing, stale, unapproved, contradictory, or ambiguous.
- Use `.agents/skills/openspec-apply-change/SKILL.md` for preflight, adapted to the `workflow/specs/` and `workflow/tasks/` layout.
- Work in a separate branch or worktree, for example `codeclinic-rename-impl`, created from `codeclinic-scope` after the human approves committing the current changes there.

## Allowed files

- Everything under `src/codeclinic/` except `node_modules/` and `build/`, limited to the changes T01–T06 describe.
- `docs/UserGuide.md` and `docs/DeveloperGuide.md` (T07).
- `workflow/tasks/codeclinic-rename/implementation-report.md` and `logs/tasks/codeclinic-rename/`.

Not in scope:

- New dependencies, or changes to dependency versions. The `package-lock.json` name field is the only lockfile change allowed.
- Moving packages to `devDependencies`, which belongs to `environments-and-deployment`.
- `apphosting.yaml` values other than the variable names.
- New App Hosting files, `firebase.json` rules, and CI.
- Historical evidence under `workflow/tasks/` and `logs/tasks/` for other tasks.

If a change outside these files seems necessary, stop and ask.

## Trusted and untrusted inputs; authorization

- All request bodies, the login type selector, browser paths, React state, and browser storage remain untrusted. Server-stored `accountType`, `accountStatus`, and `isManager` remain the only authority.
- Records holding `MEMBER`, `LIBRARIAN`, or `memberId` are treated as malformed and fail closed; there is no migration code.
- The renames must not loosen any check. Login keeps its uniform `401`, rate limits, the Argon2id parameters, the session lifetimes, CSRF on logout, and the `__Host-` cookie attributes.

## Test rules

Existing tests may change only to:

- rename values, labels, routes, cookie or storage names, variable names, the project ID, and file names;
- delete tests whose only subject is the removed Book catalog or seed script.

No assertion about security, validation, status codes, or fail-closed behavior may be removed or weakened. The reviewer compares old and new test files to confirm this.

## Permissions, tools, and external access

- Allowed:
  - read the repository and edit allowed files;
  - run `npm ci` with the locked dependencies (use `--cache` with a writable temporary directory if `~/.npm` is not writable);
  - run `npm test` and `npm run build`;
  - run the Firestore emulator for the opt-in integration test.
- Not allowed: other network access, real credentials, deploying, pushing, or merging.

## Selected skills

- `openspec-apply-change`: implementation preflight (path-adapted).
- `seedu-git-standard`: commit message format, if the human later approves a commit. No AI attribution in commit messages.

## Test matrix

| Task | Required evidence |
| --- | --- |
| T01 | Server registration, login, and session tests pass with `STUDENT`/`TA`; a stored `MEMBER` record fails closed |
| T02 | Page tests for the Student/TA choices, labels, messages, and request values |
| T03 | Route tests for the new paths, cross-role denial, refresh, and logout; the former paths are not served |
| T04 | No catalog route, module, or test remains; the student dashboard renders the greeting; the full suite passes |
| T05 | Configuration, cookie, and storage tests with the new names; the former variable names are not read; the `libconnect` search finds nothing |
| T06 | The existing email canonicalization tests pass unchanged apart from import paths |
| T07 | Every UI label quoted in the User Guide appears in the code |
| T08 | Full suite, build, emulator integration test, and search results recorded |

## Known risks

- **Overlapping files:** T01, T02, T05, and T06 all touch `login.js`, `register.js`, and the page components, so grouping must avoid parallel edits to the same file.
- **Local data:** existing local emulator data under `libconnect-mp4` is not reused. Developers start the emulator with `demo-codeclinic` and register new synthetic accounts.
- **Deployed environments:** the deployed backends need the `CODECLINIC_*` variable names. The `environments-and-deployment` task creates the per-environment files.

## Evidence

Record the implementation report and factual logs as required by `workflow/README.md`, including the *Subagent token usage* table. Never estimate token counts.

## Approval state

The specifications listed in `spec.md` are human-approved, and the task ID and scope were confirmed on 2026-11-08. Checklist v0.1 and this handoff v0.1 are human-approved (2026-11-08). Grouping, implementation dispatch, review, commit, and merge are not approved.
