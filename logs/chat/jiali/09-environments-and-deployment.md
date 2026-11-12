# Coding Agent Interaction Summary: environments and deployment

Date: 2026-11-08 to 2026-11-12
Agents:
- Codex (orchestrator `gpt-6-sol`), 8 Nov
- Claude Code (Claude Opus 5.5), 9–12 Nov, single agent

Task ID: `environments-and-deployment`, including the 12 Nov defect fix `fix-stale-index-cache`
Specification: [`workflow/specs/environments-and-deployment.md`](../../../workflow/specs/environments-and-deployment.md) v0.3
Scope of this summary: every interaction about environments and deployment, across five sessions, ending with the fix for the blank live app and the first CI workflow.

## Objective and context

The brief requires online deployment, separate development and production environments, and deployment automation owned by the team. The approved spec v0.3 sets out:
- local development on the Firestore emulator (`demo-codeclinic`), and production on `libconnect-mp4`;
- CI in GitHub Actions (R4);
- a gated GitHub Actions production deploy with App Hosting auto-rollout disabled (R6);
- smoke checks (R7).

## Discussion summary

1. **8 Nov, Codex.** The human created two Firebase projects and asked what to do next. Codex gave setup steps and asked for approval before recording the project IDs in the spec:
   - the Blaze plan and Firestore in production mode;
   - one App Hosting backend per project, with automatic rollouts disabled and the root at the not-yet-renamed `src/libconnect-mp4`.

   Spec v0.3, approved the same day, chose a simpler setup instead: one cloud project for production and the emulator for development. The two new projects went unused.
2. **8 Nov, Codex.** Codex drafted the deployment checklist and handoff. 
3. **9 Nov, Claude Code.** The teammate reported: "auto deployment is set up … any pushes to main … deploy on its own". That is App Hosting's automatic rollout, not the gated workflow in R6. The human deployed the TA queue Firestore indexes with `firebase deploy --only firestore:indexes` after `53bd2f5` referenced the index file.
4. **10 Nov, Claude Code.** `34f6a9b` added the SoCLaaS production settings to `apphosting.yaml`. The human said deployment was now shared.
   - Before deploying the fixed indexes, the agent compared the live indexes with the repository file. The broken merged file had never been deployed, and the student-activity indexes were missing.
   - The human approved, and the agent then checked that the indexes became ready.
5. **11 Nov, Claude Code.** The human decided the deployment drafts were no longer useful. The agent looked at the three uncommitted drafts and then deleted them; the committed spec stayed.
6. **Root cause of the blank page, verified step by step:**
   - curl always got the new bundle (`main.7b9a8cf8.js`), while Chrome loaded an old one (`main.5b968348.js`) that now returns `404`;
   - the browser had no service worker and nothing in Cache Storage, and the page load was a 300-byte revalidation;
   - production sends `last-modified: 1980-01-01` and an ETag made from size and that time, and the same ETag returns `304`.

   App Hosting builds every file with the same timestamp, so every 514-byte `index.html` got the same ETag across releases.
8. **No GitHub Action existed.** The checks on `main` were App Hosting's rollout (`firebase-app-hosting` app) and GitHub Pages. The human approved adding CI.
9. The human approved, through the question tool:
   - fixing the dependency issues, after the strict audit found 17 high findings;
   - committing, pushing and opening the PR;
   - downloading Gitleaks for a local scan.
10. **Production inbox index missing.** While checking the Developer Guide
    against the code, the agent saw that the inbox list query (`where
    recipientUserId ==`, `orderBy createdAt desc`) needs a composite index that
    `firestore.indexes.json` did not define. The human approved a read-only
    `firebase firestore:indexes --project prod`. It showed 5 `tickets` indexes
    and 1 `replies` index, and none for `notifications`. Fix in PR #14:
    - added the index;
    - extended the index test, which records the real inbox query, requires
      exactly one matching index, and fails without it.
11.  **Deploy workflow.** The agent wrote `deploy-prod.yml` (spec R6, R7, R9)
    and a setup guide for the human-only steps (R8). The agent ran the
    smoke-check script against production before pushing. It passed, and it
    failed correctly when an expected status was changed. The human did the
    setup: Workload Identity Federation, the `production` environment, and the
    repository variables.
12. The agent checked the current repository against a feedback report human uploaded. Several were already
    fixed:
    - strict TypeScript, with a clean `tsc --noEmit`;
    - CI;
    - dependency audit;
    - no tracked build files.

    The agent found two defects of the same kind as before, and the human
    approved fixing both (PR #16):
    - **Rejected AI requests used up quota.** `server/ai/gateway.js` reserved
      per-user and global capacity before the content check. The fix moved the
      content check first, amended spec `ai-gateway.md` to v0.2 (the human
      replied "approved v0.2"), and added a regression test that failed 3/3
      before the change.
    - **No Firestore rules (spec R3).** The fix added a deny-all
      `firestore.rules`, referenced it in `firebase.json`, deployed it through
      *Deploy production*, added the `roles/firebaserules.admin` role (granted
      by the human), and added a test. The Firestore emulator started with the
      rules.
13. **The approval gate was not on.** After the PR #16 merge, *Deploy
    production* ran and deployed with no approval. The human said "i did
    nothing". The agent checked the environment, run and branch settings:
    - the `production` environment had only a branch rule, with no required
      reviewers;
    - no approval was recorded for the run;
    - the `main` ruleset existed but its enforcement was *Disabled*.

    The human added both team members as required reviewers and activated the
    ruleset. A manual run then waited at the gate and finished after approval.
    The ruleset requires a pull request and the three CI checks.

## Key decisions and rationale

- **Content-based ETag for the app shell:** `res.send` makes the tag from the content, so it changes with every release and still returns a cheap `304` when nothing changed. `res.sendFile(..., { etag: false })` was tried first. A failing test showed that Express 5 overrides that option with the app-wide setting, and turning that off would also have removed ETags from API responses.
- **Test written to fail on the old code:** the regression test sets file times to 1980 to mimic App Hosting. It was run against the old `server/index.js` to confirm it fails there.
- **Fixed the audit, not the threshold:**
  - removed the unused `firebase` client SDK;
  - moved build and test tooling to `devDependencies`;
  - checked that no versions changed, and that the server loads with production dependencies only.
- **Exact fingerprints, not disabled rules:** the 4 Gitleaks matches (redaction-test inputs, a mocked password, and an upstream doc example) are allowlisted one by one, so any new secret still fails CI.
- **Hardened workflow (R9):** `contents: read`, actions pinned to commit SHAs, a checksum-verified binary, no deployment, and cancellation of superseded runs.
- **Keyless, gated deployment:** Workload Identity Federation instead of a
  service-account key in GitHub. The provider accepts tokens only from this
  repository, and the service account holds only index-deployment roles. The
  run waits for a team member to approve the `production` environment.
  `--non-interactive` never deletes a production index that is missing from
  the file.
- **Identifiers as variables, not secrets:** the provider, service account,
  project ID and URL are public identifiers. GitHub also does not allow secrets
  in a job's environment URL.
- **Personal data kept out of evidence:** the evidence logs were checked for home-directory paths and email addresses before committing.

## Agents and coordination

- One agent. The work was a sequence of dependent diagnoses, each needing the result of the last, so parallel agents would not have helped.
- Every step that crosses an approval boundary was asked and answered in chat:
  - the code fix;
  - the CI change;
  - the dependency change;
  - the download;
  - the commit and push.

## Work completed

- PR #12 `fix-stale-index-cache`:
  - `664aa19` *Server: Stop browsers keeping a stale app shell*
  - `1d2cda2` *Dependencies: Keep build tooling out of production*
  - `e4fcb61` *CI: Add test, audit and secret-scan workflow*
- Evidence: [`workflow/tasks/fix-stale-index-cache/implementation-report.md`](../../../workflow/tasks/fix-stale-index-cache/implementation-report.md) and [`logs/tasks/fix-stale-index-cache/`](../../tasks/fix-stale-index-cache/).
- PR #14 `add-notifications-index`:
  - `817b6b6` *Firestore: Add the notification inbox index*
  - `3d082f1` *CI: Add the production index deploy workflow*, with the setup guide [`deploy-prod-setup.md`](../../../workflow/tasks/environments-and-deployment/deploy-prod-setup.md)
- PR #16 `gateway-quota-and-rules`:
  - `848ed4f` *AI gateway: Validate content before reserving quota*
  - `249f1fb` *Firestore: Deny client access with security rules*
  - Evidence: [`workflow/tasks/gateway-quota-and-rules/implementation-report.md`](../../../workflow/tasks/gateway-quota-and-rules/implementation-report.md)
- PRs #12, #14 and #16 were merged by the human on 2026-11-12.

## Verification

- Local:
  - full suite: 1445 tests passed, 10 opt-in tests skipped;
  - `npm ci`, `npm run build` and `npm audit --omit=dev --audit-level=high` pass;
  - Gitleaks: no leaks.
- CI on PR #12: all three jobs pass. The job log shows that "Test and build" ran 1445 tests and compiled the build.
- Production after merge:
  - `/` sends `Cache-Control: no-cache` and a content-based ETag, with no
    1980 `Last-Modified`;
  - the hashed bundle is `public, max-age=31536000, immutable`.
- *Deploy production* run: both jobs passed. The smoke checks returned
  `GET / -> 200`, `GET /register -> 200` and `GET /api/auth/session -> 401`.
- `firebase firestore:indexes --project prod` now lists the `notifications`
  index (`recipientUserId` ascending, `createdAt` descending).
- PR #16:
  - local full suite: 1606 passed, 10 opt-in skipped;
  - CI: all three jobs passed.
- *Deploy production* after the PR #16 merge:
  - the log shows "rules file firestore.rules compiled successfully" and
    "released rules firestore.rules to cloud.firestore";
  - the indexes deployed;
  - all three smoke checks passed.
- Approval gate: GitHub lists `production` with required reviewers for both
  team members, and the next manual run waited for approval before deploying.
- Branch protection: the `main` ruleset is active and requires a pull request
  plus `Test and build`, `Production dependency audit` and `Secret scan`.

## Resource use

| Session | Agent | Calls | Cache read / cached | Cache write | Output | Cache-hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| 8 Nov orchestration (deployment part not separable) | Codex | — | 1,972,096 of 2,152,070 input | — | 8,527 | 91.6% |
| 12 Nov, this session, up to the deploy test | Claude Code | 178 | 33,653,303 | 657,615 | 149,646 | 98.1% |

Method:
- Claude Code usage is counted once per message ID, because a message's usage repeats on each content block. Without that, the totals in logs 06–08 would have been about twice as high.
- Reading every transcript directly would have cost more than its full size of about 50 MB. A local script condensed each one into prompts, decisions, agent operations, commits and token totals, about 390 KB in all, and only the parts each log needed were read.

## Open items and next steps

- The human should sign in on the live app and confirm that the Notifications list loads.
- Spec R6 is only partly done: the app is still rolled out by App Hosting's automatic rollout on every merge to `main`, outside the approval gate. Branch protection means CI must pass before that merge.
- The run after the PR #16 merge deployed without approval, because the reviewers were not yet set. It was the same commit that CI had passed, so nothing unchecked was deployed.
- PRs #12 and #14 were merged without an independent agent review, which `AGENTS.md` asks for. Their CI runs and the production checks above are the verification on record.
