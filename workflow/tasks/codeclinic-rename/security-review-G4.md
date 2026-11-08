# Security review: codeclinic-rename Group 4 (T05)

Reviewer: independent `reviewer` agent, run in Cursor. Date: 2026-11-08.
Scope: `git diff HEAD -M` in `wt/t05` (branch `codeclinic-rename-t05`, base `522afc4`). Main report: [`review-G4.md`](review-G4.md). Log: [`logs/tasks/codeclinic-rename/review-G4.md`](../../../logs/tasks/codeclinic-rename/review-G4.md).

## Result

There are no Critical, High, or Medium security findings. T05 changes only string constants, configuration names, and text. No trust boundary, authorization rule, session rule, CSRF rule, rate limit, or validation rule changed.

## Checks

| Area | Evidence | Result |
| --- | --- | --- |
| Firestore target still fails closed | `server/firestore-target.js:12-31`. Only the constant, the two `env.*` property names, and two error strings changed. The comparison logic and branches are byte-identical. There is no default mode and no fallback. | Unchanged |
| Former variable names not read | The server reads only `CODECLINIC_FIRESTORE_MODE` and `CODECLINIC_FIRESTORE_PROJECT_ID`. New tests (`test/firestore-target.test.js:85-98`) show that an environment holding only the former names throws in both modes. | Met |
| Local mode cannot reach the cloud | Local mode requires `demo-codeclinic` and loopback `127.0.0.1:8080`, and rejects a mismatched `GOOGLE_CLOUD_PROJECT`. The `demo-` prefix is emulator-only, and the former local ID is now rejected (`:100-103`). Before T05, the local ID equalled the production project ID (`libconnect-mp4`). After T05, they differ, which improves separation (env spec R1). | Improved |
| Production cannot use the emulator | Production mode still rejects `FIRESTORE_EMULATOR_HOST` and `GOOGLE_APPLICATION_CREDENTIALS`, and requires `K_SERVICE` and a matching `GOOGLE_CLOUD_PROJECT`. The rejection table (`test/firestore-target.test.js:62-79`) is intact. | Unchanged |
| Production with the demo project | There is no explicit `demo-` rejection in production mode (unchanged from before). It is effectively blocked by the runtime and metadata project-match checks. | Info (review F4) |
| Session cookie | `server/auth/login.js:12` is renamed to `__Host-codeclinic_session`. `:135` still emits `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=…` with no `Domain`, so the `__Host-` prefix rules still hold. `:154` reads the same constant. Attribute assertions are intact (`login.session.test.js:126-128`, `LoginPage.integration.test.tsx:167-171`, logout `Max-Age=0`). | Unchanged |
| Session, CSRF, rate limit, Argon2id, routing | No diff in these files apart from the cookie constant. | Unchanged |
| Client storage | `codeclinic.registrationNotice` is a display-only hint in `sessionStorage` and grants no authority. | Unchanged |
| Secrets and credentials | No secret, credential, session value, or personal data was added. `libconnect-mp4` is a public project identifier, not a secret. The `.firebaserc` `prod` alias grants no access, and the `default` alias moved from production to `demo-codeclinic`, so a bare `firebase` command now targets the emulator-only ID. | No exposure; risk reduced |
| Dependencies | The lockfile changes only the two root `name` fields. No package, version, or integrity entry changed. | Safe |
| Log messages | `server/index.js:41,47` are renamed only, and still do not print configuration values or credentials. | Unchanged |
| Tests | No security assertion was removed or weakened. The `firestore-target` assertion count went from 41 to 45. | Met |

## AI and agent boundary

T05 has no AI, LLM, retrieval, or tool-use surface, so prompt-injection checks are not applicable. I treated the implementer's report and handoff as context only, and checked the claims against the diff and the re-run results.

## Residual risks

- Deploying the renamed cookie signs out existing sessions. This is expected and fail-closed.
- Deployed backends must use the `CODECLINIC_*` names. Without them, startup fails closed. `apphosting.yaml` already provides them.
- The opt-in emulator integration test was not run (T08).
