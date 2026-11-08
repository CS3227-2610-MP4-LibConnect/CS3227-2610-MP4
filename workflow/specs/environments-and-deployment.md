# Environments and deployment specification

Version: 0.3 (2026-11-08)
Approval evidence: the human replied "approved" to version 0.3 on 2026-11-08 and named the existing `libconnect-mp4` cloud project as production; recorded at the human's request; no agent-set approval state. Earlier, the human replied "all aproved" to version 0.2 on 2026-11-08; recorded at the human's request; no agent-set approval state. Earlier, the human replied "approved both specs" to version 0.1 on 2026-11-08; no agent-set approval state.
Task ID: `environments-and-deployment` (from approved `workflow/PLAN.md` v0.1)

## Purpose and scope

Give CodeClinic a local development environment and a separate, deployed
production environment, and deploy production through team-owned GitHub Actions
automation. Add automated security checks
to the development process. The MP4 brief requires online deployment with
dev/prod separation and forbids build-and-host environments inside Codex or
Claude.

In scope:

- Local development configuration (Firestore emulator, local secrets).
- Firebase project and App Hosting configuration for production.
- Production secrets.
- Firestore security rules that deny all browser access.
- GitHub Actions workflows for CI and approved production deployment.
- Post-deployment smoke checks.

Out of scope:

- Creating Firebase or Google Cloud projects, billing, GitHub repository
  settings, and secrets. These are human actions, listed in R8.
- Bootstrapping the first TA Coordinator.
- Custom domains.
- The GitHub Pages product website, which is unchanged.

## Sources and current state

- `Overview.md` (approved 2026-11-08): separate development and production
  Firestore projects and credentials; deployment by team-owned automation.
- `workflow/specs/account-registration.md` v0.6, R8: explicit `local-emulator`
  and `production` Firestore modes that fail closed. This specification keeps
  those modes: local development uses `local-emulator`, and the deployed
  production backend uses `production`.
- `workflow/specs/ai-gateway.md` (draft): the `SOCLAAS_*` configuration.
- Current repository:
  - `src/codeclinic/apphosting.yaml` sets `production` mode for project
    `libconnect-mp4`.
  - `.firebaserc` has only a `default` alias, `libconnect-mp4`, which is also
    the local emulator project ID.
  - `firebase.json` configures only emulators.
  - There is no `firestore.rules` file and no `.github/workflows/`.
  - Recent commits (`5f28d7e` *Deployment fix*) show that App Hosting
    deployment of `libconnect-mp4` was attempted. Whether it uses automatic
    rollouts from GitHub is unverified.

## Environments

| Environment | Firebase project | Firestore mode | Deployed by | Data |
| --- | --- | --- | --- | --- |
| Development | `demo-codeclinic` (emulator only, on each developer's machine) | `local-emulator` | Not deployed; run locally | Synthetic, disposable |
| Production | `libconnect-mp4` (one cloud project) | `production` | GitHub Actions, after CI passes and a team member approves | Real users |

On 2026-11-08 the human chose this two-environment setup in place of a deployed
development project. The MP4 brief requires "proper separation between the
development and the production environment"; it does not require a deployed
development environment.

## Requirements

### R1. Separate environments and configuration

Development and production MUST NOT share data, credentials, or configuration:

- Development runs only against the Firestore emulator with the emulator-only
  project ID `demo-codeclinic` in `local-emulator` mode, which cannot reach a
  cloud project (account-registration v0.7 R8).
- Production runs on one Firebase project, `libconnect-mp4`, in `production`
  mode, with its own service account, Firestore database, and secrets.
- Developer machines MUST NOT need or hold production credentials. Only the
  production runtime and the deploy workflow can access the production project.

`.firebaserc` MUST define the `default` alias as `demo-codeclinic` and a `prod`
alias for the production project. `apphosting.yaml` holds the production
settings: build and run commands, run config, `CODECLINIC_FIRESTORE_MODE=production`,
`CODECLINIC_FIRESTORE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`, and secret references.

The Firestore configuration variables are named `CODECLINIC_FIRESTORE_MODE` and
`CODECLINIC_FIRESTORE_PROJECT_ID`, replacing the former `LIBCONNECT_` names.
The server MUST NOT read the former names.

### R2. Secrets

SoC issued one API key, so development and production share the provider's 90/min cap; each environment's AI limit is set by `ai-gateway` R5. In production, `SOCLAAS_API_KEY` MUST be stored in the production project's Cloud Secret Manager and
referenced by name from `apphosting.yaml`. In development, a developer MAY put
the key in the git-ignored local `.env` file; without it, the AI gateway starts
disabled (ai-gateway R2) and automated tests use fakes. Non-secret AI
configuration (`SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, `AI_GLOBAL_LIMIT_PER_MINUTE`)
MAY be plain environment values. No secret value may appear in the repository,
workflow logs, build output, or task evidence.

GitHub Actions MUST authenticate to Google Cloud through Workload Identity
Federation, with one deploy service account for the production project, scoped to
App Hosting rollouts and Firestore rules deployment. Long-lived service account
JSON keys MUST NOT be used.

### R3. Firestore security rules

A `firestore.rules` file MUST deny all client reads and writes
(`allow read, write: if false;`), because the browser never accesses Firestore
directly. `firebase.json` MUST reference it. Rules are deployed to production by the
deployment workflow and loaded by the local emulator. The server's Admin SDK access is
unaffected.

### R4. Continuous integration

`.github/workflows/ci.yml` MUST run on every pull request and every push to
`main`, from `src/codeclinic`:

1. `npm ci`
2. `npm test -- --watch=false` with `CI=true`
3. `npm run build`
4. `npm audit --omit=dev --audit-level=high`
5. Secret scanning of the full Git history with Gitleaks

A failing step MUST fail the workflow. The opt-in Firestore emulator
integration test is not required in CI.

### R5. Development environment

Development has no deployed backend. The documented local flow (Firestore
emulator, Express, and React; see the Developer Guide) is the development
environment, and the CI workflow (R4) is the shared check that every change
passes before it can reach production.

### R6. Production deployment

`.github/workflows/deploy-prod.yml` MUST run only after CI succeeds on a push to
`main`. It MUST:

- Use a GitHub Environment named `production` that requires approval by a team
  member before the job runs.
- Deploy `firestore.rules` and an App Hosting rollout of the pushed commit to
  the production project.
- Run the smoke checks in R7 against the production URL.

Automatic App Hosting rollouts from GitHub MUST be disabled on the production
backend, so the GitHub Actions workflow is the only deployment path.

### R7. Smoke checks

After each production deployment, the workflow MUST check that:

- `GET /` returns `200` with HTML.
- `GET /register` returns `200`, which shows single-page routing works.
- `GET /api/auth/session` without a cookie returns `401`.

A failed check MUST fail the workflow. Smoke checks MUST NOT create accounts,
sign in, or call AI features.

### R8. Human setup actions

These actions require a human with project access. Agents document them but
MUST NOT perform them:

1. Confirm the production project `libconnect-mp4` is on the Blaze plan.
2. Create one App Hosting backend in the production project, with root
   directory `src/codeclinic`, and disable automatic rollouts.
3. Store `SOCLAAS_API_KEY` in the production project's Secret Manager, and
   grant the backend access to it.
4. Set up Workload Identity Federation and the production deploy service
   account.
5. Add the GitHub repository variables (project ID, backend ID, provider and
   service account names) and the `production` environment with required
   reviewers.
6. Protect `main` so pull requests need a passing CI run.

### R9. Workflow hardening

Every workflow MUST declare the minimum `permissions`: `contents: read`
everywhere, and `id-token: write` only on deployment jobs. Third-party actions
MUST be pinned to a full commit SHA. Workflows MUST NOT run deployment jobs for
pull requests from forks.

## Acceptance scenarios

1. A pull request with a failing test, build error, high-severity production
   dependency vulnerability, or committed secret fails CI.
2. Merging to `main` with green CI waits for a team member's approval before
   deploying to production; without approval, production is unchanged.
3. After approval, the smoke checks pass against the production URL.
4. The local development flow cannot read or write production data: it uses
   `demo-codeclinic` in `local-emulator` mode and holds no production
   credentials.
5. A browser request through the Firestore client SDK to the production project
   is denied by the rules.
6. No workflow log or repository file contains a secret value.
7. With `SOCLAAS_API_KEY` missing, the server still
   starts and AI calls return `AI_UNAVAILABLE` (ai-gateway R2).
8. Pushing to `main` does not trigger a Firebase-managed automatic rollout.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Configuration | Review of `.firebaserc`, the App Hosting files, `firebase.json`, and `firestore.rules`; existing `firestore-target` tests still pass |
| CI | A test pull request showing each check runs; one deliberately failing branch for tests and for Gitleaks, removed afterwards |
| Deployment | Workflow run link for one approved production deployment, with smoke-check output |
| Security | Rules emulator test that denies client access; workflow `permissions` and pinned SHAs reviewed; no JSON keys in secrets |

## Open decisions and risks

1. **Project ID (resolved 2026-11-08):** production is the existing cloud
   project `libconnect-mp4`. Development is local, under the emulator-only ID
   `demo-codeclinic`. The two projects the human created earlier are not used.
2. **Dependency audit noise:** `react-scripts` is listed under `dependencies`,
   so `npm audit --omit=dev` will include its known transitive vulnerabilities.
   Options:
   - move build-only packages to `devDependencies` (preferred)
   - accept the current findings in a reviewed allowlist
   - lower the audit to a warning

   Resolved 2026-11-08: the human approved moving build-only packages to
   `devDependencies`.
3. **Gitleaks history scan:** if the existing history contains a false
   positive, it needs a reviewed `.gitleaks.toml` allowlist entry.
4. **Cost and quota:** App Hosting needs the Blaze plan in the production
   project.
5. **First TA Coordinator in each environment:** the bootstrap procedure is
   still unspecified, so TA accounts cannot be activated in production until it
   exists.

## Amendments

- 2026-11-08: Drafted at the human's direction.
- 2026-11-08: The human approved version 0.1 and approved moving build-only packages in `package.json` to `devDependencies`. Open decision 1 (project IDs) remains open.
- 2026-11-08: The human chose two new Firebase projects for development and production; their IDs are pending.
- 2026-11-08: The human approved renaming the application directory from `src/libconnect-mp4` to `src/codeclinic`. Path references in this file were updated; requirements are unchanged.
- 2026-11-08: v0.2 draft. The human directed renaming every remaining LibConnect name. The Firestore variables become `CODECLINIC_FIRESTORE_MODE` and `CODECLINIC_FIRESTORE_PROJECT_ID`, and the local emulator project ID becomes `demo-codeclinic`. The *Sources and current state* section still describes the repository as it was.
- 2026-11-08: The human approved version 0.2.
- 2026-11-08: v0.3 draft. The human chose local development (Firestore emulator) and one cloud Firebase project for production, instead of separate deployed development and production projects. R1, R2, R3, R5, R6, R8, the acceptance scenarios, and the verification matrix were updated; the deployed development workflow is removed.
- 2026-11-08: The human approved version 0.3 and named `libconnect-mp4` as the production project.
