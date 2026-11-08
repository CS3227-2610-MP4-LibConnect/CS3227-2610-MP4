# Proposed atomic commit sequence

Human decision: the user replied **ok approved** to this six-commit sequence on 2026-11-08. This supersedes the single-message proposal. The file boundaries and messages below are the approved contract; this entry records the user response and is not an agent approval.

Each commit carries its relevant tests. Apply commits in this order, checking each staged diff and validating the intermediate source tree. No dependency or product behavior change is proposed by this split.

## 1. Complete the shared AI gateway

Proposed message:

```text
Complete the shared AI gateway

The gateway units exist but do not form a usable server pipeline.

Compose validation, rate limits, redaction, provider transport, output
validation, and safe usage recording. Create the gateway at startup and
keep provider requests server-side. Include transport hardening and
pipeline, browser-boundary, and emulator integration tests.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `logs/tasks/ai-gateway/continuation.md`

- `logs/tasks/ai-gateway/review-continuation.md`

- `src/codeclinic/server/ai/gateway.js`

- `src/codeclinic/server/ai/transport.js`

- `src/codeclinic/test/ai-browser-boundary.test.js`

- `src/codeclinic/test/ai-gateway-emulator.integration.test.js`

- `src/codeclinic/test/ai-gateway.test.js`

- `src/codeclinic/test/ai-transport-hardening.test.js`

- `workflow/specs/ai-gateway.md`

- `workflow/tasks/ai-gateway/handoff.md`

- `workflow/tasks/ai-gateway/implementation-report.md`

- `workflow/tasks/ai-gateway/review-report.md`

- `workflow/tasks/ai-gateway/security-review.md`

- `workflow/tasks/ai-gateway/tasks.md`

- `src/codeclinic/server/index.js`: only the `createAiGateway` import and startup creation hunk.



## 2. Add account APIs and coordinator bootstrap

Proposed message:

```text
Add account APIs and coordinator bootstrap

Account persistence and guards exist without the account operations.

Add profile, password, status, and reset APIs and the coordinator
bootstrap. Enforce temporary-password restrictions consistently with
Express route matching, including mixed-case API paths. Keep the API,
authorization, bootstrap, and session regression tests with this change.
Adapt existing in-memory fixtures without removing security assertions.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `src/codeclinic/scripts/bootstrap-coordinator.js`

- `src/codeclinic/server/account/routes.js`

- `src/codeclinic/server/auth/login.js`

- `src/codeclinic/test/account-emulator.integration.test.js`

- `src/codeclinic/test/account-r7-server.test.js`

- `src/codeclinic/test/account-routes.test.js`

- `src/codeclinic/test/account-server-wiring.test.js`

- `src/codeclinic/test/bootstrap-coordinator.test.js`

- `src/codeclinic/test/notifications.api.test.js`

- `src/codeclinic/test/registration.api.test.js`

- `src/codeclinic/test/registration.endpoint.test.js`

- `src/codeclinic/test/server.test.js`

- `workflow/PLAN.md`

- `workflow/specs/account-management.md`

- `workflow/tasks/account-management/handoff.md`

- `src/codeclinic/server/index.js`: only account-store/router imports and `/api` account-router mount.



## 3. Add reusable notification inbox components

Proposed message:

```text
Add reusable notification inbox components

The notification API needs reusable browser components.

Add the bell and inbox components with plain-text messages, pagination,
CSRF-protected read actions, and loading and retry states. Include their
focused tests and responsive styling. Leave application mounting to the
following integration commit.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `src/codeclinic/src/notifications/Notifications.css`

- `src/codeclinic/src/notifications/Notifications.tsx`

- `src/codeclinic/test/Notifications.test.tsx`



## 4. Integrate account pages and shared navigation

Proposed message:

```text
Integrate account pages and shared navigation

The account APIs and notification components need application routes.

Add account and support pages, forced password-change handling, and
shared navigation. Mount the SPA routes and integrate the inbox and
bell.
Include page tests, compatible dashboard request fixtures, and feature
implementation and review evidence.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `logs/tasks/account-management/continuation.md`

- `logs/tasks/account-management/review-continuation.md`

- `logs/tasks/account-management/verification/build.log`

- `logs/tasks/account-management/verification/emulator.log`

- `logs/tasks/account-management/verification/regression-post-security.log`

- `logs/tasks/account-management/verification/regression.log`

- `logs/tasks/account-management/visual/account-320.jpg`

- `logs/tasks/notifications/continuation.md`

- `logs/tasks/notifications/review-continuation.md`

- `logs/tasks/notifications/visual/inbox-320.jpg`

- `src/codeclinic/src/AccountPages.css`

- `src/codeclinic/src/AccountPages.tsx`

- `src/codeclinic/src/DashboardLogout.tsx`

- `src/codeclinic/src/DashboardRouteGuard.tsx`

- `src/codeclinic/src/NotificationsRoute.tsx`

- `src/codeclinic/src/TADashboard.tsx`

- `src/codeclinic/src/index.tsx`

- `src/codeclinic/test/AccountPages.test.tsx`

- `src/codeclinic/test/DashboardRoutes.integration.test.tsx`

- `workflow/tasks/account-management/guides-proposed.md`

- `workflow/tasks/account-management/implementation-report.md`

- `workflow/tasks/account-management/review-report.md`

- `workflow/tasks/account-management/security-review-continuation.md`

- `workflow/tasks/account-management/security-review.md`

- `workflow/tasks/account-management/tasks.md`

- `workflow/tasks/notifications/implementation-report.md`

- `workflow/tasks/notifications/review-report.md`

- `workflow/tasks/notifications/security-review.md`

- `workflow/tasks/notifications/tasks.md`

- `src/codeclinic/server/index.js`: only the new account/password-change/notification SPA route hunk.



## 5. Update guides for the completed shared features

Proposed message:

```text
Update guides for the completed shared features

The guides still describe the earlier application state.

Update the current account, notification, gateway, and local setup
instructions. Reconcile the remaining rename documentation and retain
historical verification failures with dated corrections. Document the
external prerequisites without changing deployment configuration.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `docs/DeveloperGuide.md`

- `docs/UserGuide.md`

- `logs/tasks/codeclinic-rename/implement-T07-T08.md`

- `logs/tasks/codeclinic-rename/review-continuation.md`

- `src/codeclinic/README.md`

- `workflow/tasks/codeclinic-rename/implementation-report.md`

- `workflow/tasks/codeclinic-rename/review-report.md`

- `workflow/tasks/codeclinic-rename/spec.md`

- `workflow/tasks/codeclinic-rename/tasks.md`



## 6. Document team workflow findings and evidence

Proposed message:

```text
Document team workflow findings and evidence

The team reflection contains placeholders despite recorded workflow
experiments and independent review findings.

Document the observed coordination, context, and resource-use results.
Link supporting evidence and identify unmeasured comparisons explicitly.
Retain the shared continuation record and proposed commit sequence.
```

Files (only current changed/untracked files listed; do not stage entire directories):

- `docs/Reflections.md`

- `logs/tasks/codeclinic-scope/shared-continuation.md`

- `logs/tasks/codeclinic-scope/commit-plan.md` (this proposal).



## Exclusions

Leave `.claude/`, all `environments-and-deployment` draft artifacts, and the superseded single proposed-message file uncommitted. No role-owned task or deployment configuration belongs in this series.

## Verification and approval boundary

The combined implementation already passed 645 regression tests, three opt-in local emulator integrations, the production build, and independent review. At proposal time, the split had not been staged or committed. Execution uses partial staging for the shared entry point and checks isolated staged snapshots; the final-tree test result alone does not verify intermediate commits. No push or merge is included in the requested approval.

## Execution evidence

The approved sequence is executed using explicit per-commit manifests. Source
commits 1–4 passed isolated staged-tree tests and builds; the two documentation
commits receive whitespace/local-reference checks. Exact results are retained in
`shared-continuation.md`. Excluded paths remain uncommitted. No push or merge is
part of this approval.
