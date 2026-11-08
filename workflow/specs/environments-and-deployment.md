# Environments and deployment specification

Version: 0.2 (2026-11-08)
Approval evidence: the human replied "all aproved" to version 0.2 on 2026-11-08; recorded at the human's request; no agent-set approval state. Earlier, the human replied "approved both specs" to version 0.1 on 2026-11-08; no agent-set approval state.
Task ID: `environments-and-deployment` (from approved `workflow/PLAN.md` v0.1)

## Purpose and scope

Give CodeClinic separate development and production environments, and deploy
both through team-owned GitHub Actions automation. Add automated security checks
to the development process. The MP4 brief requires online deployment with
dev/prod separation and forbids build-and-host environments inside Codex or
Claude.

In scope:

- Firebase project and App Hosting configuration for each environment.
- Per-environment secrets.
- Firestore security rules that deny all browser access.
- GitHub Actions workflows for CI, development deployment, and approved
  production deployment.
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
  those modes. A deployed development backend uses `production` mode, which
  means "real Firestore from a deployed runtime", against the development
  project.
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

| Environment | Firebase project | App Hosting environment name | Deployed by | Data |
| --- | --- | --- | --- | --- |
| Local | `demo-codeclinic` (emulator only) | — | Developer | Synthetic, disposable |
| Development | `<dev-project-id>`, a new project | `development` | GitHub Actions, on each merge to `main` | Synthetic test data only |
| Production | `<prod-project-id>` | `production` | GitHub Actions, after a manual approval | Real users |

The human chose two new projects on 2026-11-08 and will supply their IDs (R8).
The local emulator uses the emulator-only project ID `demo-codeclinic` (account-registration v0.7).

## Requirements

### R1. Separate projects and configuration

Development and production MUST use different Firebase projects, App Hosting
backends, service accounts, Firestore databases, and secrets. No configuration
file, workflow, or secret may let one environment read or write the other's
data.

`.firebaserc` MUST define the aliases `dev` and `prod`. App Hosting
configuration MUST be split into:

- `apphosting.yaml`: shared settings (build and run commands, run config).
- `apphosting.development.yaml` and `apphosting.production.yaml`: each
  environment's `CODECLINIC_FIRESTORE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`, and
  secret references.

Both deployed environments set `CODECLINIC_FIRESTORE_MODE=production`.

The Firestore configuration variables are named `CODECLINIC_FIRESTORE_MODE` and
`CODECLINIC_FIRESTORE_PROJECT_ID`, replacing the former `LIBCONNECT_` names.
The server MUST NOT read the former names.

### R2. Secrets

SoC issued one API key, so both environments use the same key value and share the provider's 90/min cap; each environment's AI limit is set by `ai-gateway` R5. `SOCLAAS_API_KEY` MUST be stored in each project's Cloud Secret Manager and
referenced by name from that environment's App Hosting file. Non-secret AI
configuration (`SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, `AI_GLOBAL_LIMIT_PER_MINUTE`)
MAY be plain environment values. No secret value may appear in the repository,
workflow logs, build output, or task evidence.

GitHub Actions MUST authenticate to Google Cloud through Workload Identity
Federation, with one deploy service account per project, scoped to
App Hosting rollouts and Firestore rules deployment. Long-lived service account
JSON keys MUST NOT be used.

### R3. Firestore security rules

A `firestore.rules` file MUST deny all client reads and writes
(`allow read, write: if false;`), because the browser never accesses Firestore
directly. `firebase.json` MUST reference it. Rules are deployed to each
environment by its deployment workflow. The server's Admin SDK access is
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

### R5. Development deployment

`.github/workflows/deploy-dev.yml` MUST run only after CI succeeds on a push to
`main`. It MUST:

1. Deploy `firestore.rules` to the development project.
2. Create an App Hosting rollout of the pushed commit to the development
   backend.
3. Run the smoke checks in R7 against the development URL.

### R6. Production deployment

`.github/workflows/deploy-prod.yml` MUST be started manually
(`workflow_dispatch`) with a commit SHA that has already deployed successfully
to development. It MUST:

- Use a GitHub Environment named `production` that requires approval by a team
  member before the job runs.
- Deploy `firestore.rules` and an App Hosting rollout of that commit to the
  production project.
- Run the smoke checks in R7 against the production URL.

Automatic App Hosting rollouts from GitHub MUST be disabled on both backends,
so the GitHub Actions workflows are the only deployment path.

### R7. Smoke checks

After each deployment, the workflow MUST check that:

- `GET /` returns `200` with HTML.
- `GET /register` returns `200`, which shows single-page routing works.
- `GET /api/auth/session` without a cookie returns `401`.

A failed check MUST fail the workflow. Smoke checks MUST NOT create accounts,
sign in, or call AI features.

### R8. Human setup actions

These actions require a human with project access. Agents document them but
MUST NOT perform them:

1. Choose the development and production project IDs, and create the
   development project.
2. Create an App Hosting backend in each project, and disable automatic
   rollouts.
3. Store each environment's `SOCLAAS_API_KEY` in Secret Manager, and grant the
   backend access to it.
4. Set up Workload Identity Federation and the deploy service accounts.
5. Add the GitHub repository variables (project IDs, backend IDs, provider and
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
2. Merging to `main` with green CI deploys to development only; the smoke
   checks pass against the development URL, and production is unchanged.
3. Production deploys only after a manual start with a SHA that passed
   development and a team member's approval; the smoke checks pass against the
   production URL.
4. The development backend cannot read production data: its configuration
   names only the development project, and its service account has no access
   to the production project.
5. A browser request through the Firestore client SDK to either project is
   denied by the rules.
6. No workflow log or repository file contains a secret value.
7. With `SOCLAAS_API_KEY` missing in an environment, the deployed server still
   starts and AI calls return `AI_UNAVAILABLE` (ai-gateway R2).
8. Pushing to `main` does not trigger a Firebase-managed automatic rollout.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Configuration | Review of `.firebaserc`, the App Hosting files, `firebase.json`, and `firestore.rules`; existing `firestore-target` tests still pass |
| CI | A test pull request showing each check runs; one deliberately failing branch for tests and for Gitleaks, removed afterwards |
| Deployment | Workflow run links for one development and one production deployment, with smoke-check output |
| Security | Rules emulator test that denies client access; workflow `permissions` and pinned SHAs reviewed; no JSON keys in secrets |

## Open decisions and risks

1. **Project IDs (partly resolved 2026-11-08):** the human chose two new
   Firebase projects, one for development and one for production. The existing
   `libconnect-mp4` cloud project is not used by either deployed environment.
   The local emulator uses `demo-codeclinic`. The exact new project IDs are still
   to be supplied by the human.
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
4. **Cost and quota:** App Hosting needs the Blaze plan in each project.
5. **First TA Coordinator in each environment:** the bootstrap procedure is
   still unspecified, so TA accounts cannot be activated in deployed
   environments until it exists.

## Amendments

- 2026-11-08: Drafted at the human's direction.
- 2026-11-08: The human approved version 0.1 and approved moving build-only packages in `package.json` to `devDependencies`. Open decision 1 (project IDs) remains open.
- 2026-11-08: The human chose two new Firebase projects for development and production; their IDs are pending.
- 2026-11-08: The human approved renaming the application directory from `src/libconnect-mp4` to `src/codeclinic`. Path references in this file were updated; requirements are unchanged.
- 2026-11-08: v0.2 draft. The human directed renaming every remaining LibConnect name. The Firestore variables become `CODECLINIC_FIRESTORE_MODE` and `CODECLINIC_FIRESTORE_PROJECT_ID`, and the local emulator project ID becomes `demo-codeclinic`. The *Sources and current state* section still describes the repository as it was.
- 2026-11-08: The human approved version 0.2.
