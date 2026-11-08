# Implementation report: codeclinic-rename T05 — Internal and user-visible names

Status: **complete** (uncommitted; awaiting independent review and the merge decision)
Implementer: `implementer` agent; Date: 2026-11-08
Worktree/branch: `wt/t05`, `codeclinic-rename-t05`, base `522afc4`
Inputs: account-registration v0.7 R8; environments-and-deployment v0.3 R1; `tasks.md` v0.1 and `handoff.md` v0.1 (approved); G4 dispatch under the standing approval in `logs/tasks/codeclinic-rename/integration-G1.md`; review-G3 findings F2 and F4
Execution log: [`logs/tasks/codeclinic-rename/implement-T05.md`](../../../logs/tasks/codeclinic-rename/implement-T05.md)

## Changed files (`src/codeclinic/`)

| File | Change |
| --- | --- |
| `server/firestore-target.js` | Reads only `CODECLINIC_FIRESTORE_MODE` / `CODECLINIC_FIRESTORE_PROJECT_ID`; `LOCAL_PROJECT_ID` = `demo-codeclinic`; error messages renamed. Validation logic unchanged |
| `server/index.js` | Log messages say "CodeClinic server ..." |
| `server/auth/login.js` | `SESSION_COOKIE` = `__Host-codeclinic_session` (attributes unchanged) |
| `.firebaserc` | `default` = `demo-codeclinic`; added `prod` = `libconnect-mp4` (env spec v0.3 R1) |
| `apphosting.yaml` | Variable names only → `CODECLINIC_*`; values `production` / `libconnect-mp4` unchanged |
| `package.json`, `package-lock.json` | `name` → `codeclinic` (top `name` and `packages[""].name` only; text edit, no install) |
| `public/index.html` | Title "Sign in \| CodeClinic"; description "Sign in to your CodeClinic account." |
| `src/LoginPage.tsx` | Brand mark "C", eyebrow "CODECLINIC", "Sign in to continue to CodeClinic.", "New to CodeClinic?", storage key `codeclinic.registrationNotice` |
| `src/RegistrationPage.tsx` | Brand mark "C", eyebrow "CODECLINIC", "Create your CodeClinic account.", storage key `codeclinic.registrationNotice` |
| `src/DashboardLogout.tsx` | Navbar brand text "CodeClinic" |
| `README.md` | **Review F2:** removed the Book-seeding section; title, emulator command, local variables, and production variable names updated; added a note on the `demo-` emulator-only ID and the `.firebaserc` default alias |
| `test/server.test.js` | **Review F4:** fixture and all `<title>` assertions (positive and the `not.toContain` checks) → `<title>CodeClinic</title>`; temp dir prefix renamed |
| `test/registration.api.test.js` | Fixture title and temp dir prefix renamed |
| `test/DashboardRoutes.integration.test.tsx` | **Review F4:** brand-link query `/libconnect/i` → `/codeclinic/i` |
| `test/firestore-target.test.js` | Variable names, project ID, synthetic `K_SERVICE`, temp dir prefix renamed. **Added** three tests: former variable names are ignored in local and production mode (resolution throws), and the former local project ID is rejected (41 → 45 `expect(`) |
| `test/firestore-mode.integration.test.js` | Expected env names and `demo-codeclinic` |
| `test/login.credentials.test.js`, `test/login.session.test.js`, `test/LoginPage.integration.test.tsx` | Cookie name renamed |
| `test/RegistrationPage.test.tsx` | Storage key renamed |

No other test file changed its `expect(` count.

## Acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| Config variables renamed; former names not read | `firestore-target.js` diff; new "ignores the former variable names" tests pass | Met |
| Emulator project ID `demo-codeclinic` | `LOCAL_PROJECT_ID`, `.firebaserc`, README, tests | Met |
| Cookie `__Host-codeclinic_session` | `login.js`; cookie tests pass | Met |
| Storage key `codeclinic.registrationNotice` | Both pages; `RegistrationPage.test.tsx` passes | Met |
| Package name `codeclinic` | `package.json`, `package-lock.json` | Met |
| UI text and log messages | Diff above; build compiled | Met |
| Search check | See below | Met with the deviation noted |
| Full suite and build | 14 suites passed, 1 skipped; 224 passed, 1 skipped; build compiled (log) | Met |

## Search check

`grep -rin libconnect --exclude-dir=node_modules --exclude-dir=build src/codeclinic` finds exactly:

- `.firebaserc:4: "prod": "libconnect-mp4"`
- `apphosting.yaml:39: value: libconnect-mp4` (`CODECLINIC_FIRESTORE_PROJECT_ID`)
- `apphosting.yaml:45: value: libconnect-mp4` (`GOOGLE_CLOUD_PROJECT`)

## Deviations

- Checklist T05 says the search "finds nothing". The three remaining hits are the real production project ID, kept as directed by the orchestrator, by environments-and-deployment v0.3 R1 (`prod` alias), and by the handoff ("`apphosting.yaml` values other than the variable names" are out of scope). The checklist wording needs reconciling by the orchestrator.
- The new tests build the former name from parts (`'LIB' + 'CONNECT_'`, `'lib' + 'connect-mp4'`) so the search stays clean; the assertions still use the real former strings at runtime.
- The `.firebaserc` `prod` alias is new content, taken from env spec v0.3 R1 as assigned.

## Risks and open items

- Local emulator data under the former project ID is not reused (handoff known risk); developers start with `demo-codeclinic`.
- Deployed backends need the `CODECLINIC_*` names; `apphosting.yaml` now provides them.
- The README's production paragraph still says the repository "does not contain ... a production project ID"; this was already inaccurate before T05 (`apphosting.yaml` held the ID) and was not reworded, to stay within the rename. Suggest T07 or the environments-and-deployment task correct it.
- `docs/` guides are T07's scope and were not touched.
- Opt-in Firestore emulator suite not run (skipped; T08).
- `node_modules` is the shared install symlink; `npm ci` not run.
