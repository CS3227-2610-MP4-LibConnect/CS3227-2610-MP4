# Review report: codeclinic-rename Group 4 (T05 — Internal and user-visible names)

Reviewer: independent `reviewer` agent, run in Cursor (did not write this code). Date: 2026-11-08.
Worktree/branch: `wt/t05`, `codeclinic-rename-t05`, base `522afc4` (verified). Changes are uncommitted and unstaged: 21 modified files under `src/codeclinic/`, plus 2 untracked evidence files.
Diff reviewed: `git diff HEAD -M` (21 files, +89 / -80).
Inputs checked: `tasks.md` v0.1 and `handoff.md` v0.1 (human-approved 2026-11-08); `spec.md`; `environments-and-deployment.md` v0.3 R1 (human-approved 2026-11-08, names `libconnect-mp4` as production); `account-registration.md` v0.7 R8; `implementation-T05.md`; `logs/tasks/codeclinic-rename/implement-T05.md`; `review-G3.md` F2 and F4; standing approval in `logs/tasks/codeclinic-rename/integration-G1.md`.
Execution log: [`logs/tasks/codeclinic-rename/review-G4.md`](../../../logs/tasks/codeclinic-rename/review-G4.md). Security review: [`security-review-G4.md`](security-review-G4.md).

This report is an assessment. It is not approval to merge or commit.

## Verdict

**Pass with follow-up (ready).** There are no Critical or High findings. Every T05 rename is complete and tested. No security behaviour changed. All removed test lines are renames, and no assertion was removed or weakened. The checklist's "search finds nothing" criterion is not literally met. The three remaining hits are the real production project ID, which approved environments-and-deployment v0.3 R1 and the handoff require to stay (F1). The orchestrator must record this deviation and reconcile the checklist wording. The README's production paragraph is now inaccurate (F2) and should be fixed.

## Acceptance-criteria traceability

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| Variables renamed to `CODECLINIC_*`; the server does not read the former names | `server/firestore-target.js:13-14,30`; `apphosting.yaml:32,38`; `README.md:23-24,54-55`. A search finds no remaining reads of `LIBCONNECT_*` | `test/firestore-target.test.js:6-16,62-72` (renamed fixtures and rejection table); new `:85-98` ("ignores the former variable names" for local and production mode both throw); `test/firestore-mode.integration.test.js:10-11` | Met |
| Emulator project ID `demo-codeclinic` | `server/firestore-target.js:5,18`; `.firebaserc:3`; `README.md:13,16-18,24` | `test/firestore-target.test.js:8,51,58`; new `:100-103` rejects the former local ID | Met |
| Session cookie `__Host-codeclinic_session` | `server/auth/login.js:12`. The attribute line `:135` is unchanged (`Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age`), and `:154` reads the same constant | `login.credentials.test.js:103`; `login.session.test.js:88`; `LoginPage.integration.test.tsx:167-170` (name, Secure, HttpOnly, SameSite) | Met |
| Storage key `codeclinic.registrationNotice` | `src/LoginPage.tsx:5`; `src/RegistrationPage.tsx:7` | `RegistrationPage.test.tsx:197,217,225` (set, consumed, and absent on failure) | Met |
| Package name `codeclinic` | `package.json:2`; `package-lock.json:2,8` (only the two `name` fields) | build compiles | Met |
| UI text and log messages | `public/index.html:7-8`; `LoginPage.tsx:86-89,161`; `RegistrationPage.tsx:122-125`; `DashboardLogout.tsx:71`; `server/index.js:41,47` | `server.test.js:50,54,61-62,75,81` (title, including the G3 F4 `not.toContain` checks); `DashboardRoutes.integration.test.tsx:346` (brand link); built `build/index.html` title is "Sign in \| CodeClinic" | Met |
| Search for `libconnect` finds nothing | three hits remain: `.firebaserc:4`, `apphosting.yaml:39`, `apphosting.yaml:45` | `grep -rin libconnect . --exclude-dir=node_modules --exclude-dir=build` | **Not literally met; justified deviation (F1)** |
| G3 F2: README seeding section removed | `README.md` no longer mentions the seed script or Books | grep | Met |
| G3 F4: title checks updated | fixture and every `<title>` assertion in `server.test.js` renamed together, so the negative 404 checks still test the real shell | full suite | Met |

## Test-rule comparison (handoff "Test rules")

| File | `expect(` before → after | Test cases before → after | Change | Assessment |
| --- | ---: | ---: | --- | --- |
| `DashboardRoutes.integration.test.tsx` | 60 → 60 | 21 → 21 | brand-link regex | Rename only |
| `LoginPage.integration.test.tsx` | 40 → 40 | 4 → 4 | cookie name | Rename only |
| `RegistrationPage.test.tsx` | 51 → 51 | 12 → 12 | storage key | Rename only |
| `firestore-mode.integration.test.js` | 6 → 6 | 1 → 1 | variable names, project ID | Rename only |
| `firestore-target.test.js` | 41 → 45 | 8 → 10 | renames, plus new tests for the former names and former ID | Strengthened |
| `login.credentials.test.js` | 36 → 36 | 12 → 12 | cookie name | Rename only |
| `login.session.test.js` | 52 → 52 | 10 → 10 | cookie name in `cookieFrom` helper | Rename only |
| `registration.api.test.js` | 87 → 87 | 13 → 13 | temp prefix, fixture title | Rename only |
| `server.test.js` | 14 → 14 | 1 → 1 | temp prefix, fixture and assertion titles | Rename only |

I checked every removed (`-`) line in the test diff. Each one contains `libconnect` and has a renamed counterpart. No assertion about security, validation, status codes, cookie attributes, or fail-closed behaviour was removed or weakened. The new tests build the former strings from parts at runtime, so the assertions still exercise the real former values.

## Findings

| ID | Severity | Location | Evidence | Requirement / risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| F1 | Medium | `src/codeclinic/.firebaserc:4`, `src/codeclinic/apphosting.yaml:39`, `src/codeclinic/apphosting.yaml:45`; `workflow/tasks/codeclinic-rename/tasks.md` (T05 search check) | The search finds three `libconnect-mp4` values. All three are the production Google Cloud project ID. | Checklist v0.1 says the search "finds nothing". Two later or higher-precedence sources require the hits. Env spec v0.3 R1 (approved after the checklist) names `libconnect-mp4` as production and requires a `prod` alias in `.firebaserc`. The handoff puts `apphosting.yaml` values out of scope, and a cloud project ID cannot be renamed. **Ruling:** keeping the hits is correct, and removing them would break the production config. The `prod` alias is new content, not a rename. It comes from env spec v0.3 R1, while `spec.md` limits this task to the env spec's variable names. It holds no credential, and it replaces a `default` alias that pointed at production, so it lowers risk. | The orchestrator records the deviation and asks the human to amend the T05 search criterion. For example: "finds nothing except the production project ID `libconnect-mp4` in `.firebaserc` `prod` and `apphosting.yaml` values". Alternatively, the human explicitly accepts the deviation. The orchestrator should also confirm the human accepts the `prod` alias landing in T05 rather than in the environments-and-deployment task. Neither change requires a code change. |
| F2 | Low | `src/codeclinic/README.md:64-66` | States "this repository does not contain production credentials or a production project ID". The repository holds the production project ID in `apphosting.yaml:39,45`, and now also in `.firebaserc:4`. `README.md:18` mentions only the `default` alias. | The docs must match the repository. This was already untrue before T05, and T05 adds another location. The project ID is not a secret, so this has no security impact. | Reword the sentence to say the repository holds no production credentials, and that the production project ID `libconnect-mp4` is set in `apphosting.yaml` and the `.firebaserc` `prod` alias. Do this now (README is in T05 scope) or in the environments-and-deployment task. |
| F3 | Low | `workflow/tasks/codeclinic-rename/spec.md` table row `environments-and-deployment` | Cites env spec version 0.2 ("variable names only"). The implementation follows v0.3 R1, which is now approved. | Evidence traceability; spec/version drift between task artifacts. | The orchestrator updates the task reference to v0.3, or notes the v0.3 dependency in the integration log. |
| F4 | Info | `src/codeclinic/server/firestore-target.js:22-28` | Production mode has no explicit check rejecting a `demo-` project ID. This is unchanged from before T05. It is still effectively fail-closed: production mode requires `K_SERVICE`, rejects any emulator host, and requires the Cloud Run metadata project to match. A `demo-` ID cannot exist in the cloud, so it cannot match. T05 makes the local and production IDs distinct for the first time. Before T05, both were `libconnect-mp4`. | Defence in depth for env spec R1 separation. | Optional: the environments-and-deployment task could add an explicit rejection of `demo-` IDs in production mode. |
| F5 | Info | `server/auth/login.js:12`; `src/LoginPage.tsx:5` | Deploying the renamed cookie invalidates existing sessions, and any pending registration notice under the former key is dropped. | Fail-closed and expected for a rename. | Note in the release notes; no action. |
| F6 | Info | `test/LoginPage.integration.test.tsx:13-14`, `test/firestore-mode.integration.test.js:28-50`, `test/login.session.test.js:139-140` | Some test variable names and labels still say "librarian" or "member". | Outside T05, which covers `libconnect` only. These are test-only identifiers, and some intentionally test the former values. | None for T05. |

## Scope

All edits are under `src/codeclinic/` and are among the T05 files or their tests. `docs/` is untouched (T07). No dependency, version, CI, `firebase.json`, or new App Hosting file changed. `apphosting.yaml` changes are variable names only. The lockfile diff is exactly the two `name` fields (2 insertions, 2 deletions), so no dependency resolution changed. The only addition beyond a rename is the `.firebaserc` `prod` alias (F1). No auth, session lifetime, CSRF, rate-limit, routing, or validation code changed.

## Criteria not verified

- Opt-in Firestore emulator integration test with `demo-codeclinic` (skipped; scheduled for T08).
- The `firebase` CLI behaviour with the new `.firebaserc` aliases. I did not run it, because running it could contact external services.
- `npm ci` against the lockfile. `node_modules` is a shared symlinked install. This is only a text edit to the root package name, and npm does not use that name for resolution.

## Commands run

From `src/codeclinic`: `CI=true npm test -- --watch=false`, `npm run build`, `grep -rin libconnect . --exclude-dir=node_modules --exclude-dir=build`, plus the per-file `expect(` and test-case count comparison against `HEAD`. Exact results are in the log.
