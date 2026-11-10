# CodeClinic Delivery Plan

Version: 0.1 (2026-11-08)
Approval evidence: human replied "approved" to version 0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state. The owner names remain to be confirmed by the team.

This plan orders the CodeClinic features by dependency and assigns ownership.
Product scope is defined in `Overview.md`; acceptance criteria belong in each
approved specification under `workflow/specs/`. This plan grants no approval
for any specification, checklist, handoff, implementation, deployment, or merge.

Submission deadline: 13 Nov 2026, 2pm SGT.

## Feature specifications and dependencies

| Order | Task ID | Scope | Depends on | Owner | Spec status |
| --- | --- | --- | --- | --- | --- |
| 1 | `account-registration` | Student/TA registration (role rename, emulator project ID) | — | Shared | v0.7 approved |
| 1 | `role-aware-login` | Student/TA login (role rename) | — | Shared | v0.3 approved |
| 1 | `role-based-dashboards` | Student/TA dashboards (role rename) | `role-aware-login` | Shared | v0.5 approved |
| 1 | `codeclinic-rename` | Implements the three role-rename specs, removes the retired Book catalog, renames all internal LibConnect names, moves the email helpers | — | Shared | Checklist and handoff v0.1 approved |
| 2 | `environments-and-deployment` | Local development and one production Firebase project (`libconnect-mp4`), production secrets, GitHub Actions CI/CD | — | Shared | v0.3 approved; the repo has been deployed by a teammate (the human, 2026-11-09) |
| 2 | `ai-gateway` | Shared SoC LLM client: rate limits, timeouts, schema validation, redaction, token caps, fallback, usage records | — | Shared | v0.1 approved; design input in `workflow/tasks/ai-gateway/design.md` |
| 3 | `student-tickets` | Create tickets with optional code files or repository reference; editing deferred to later work | `role-based-dashboards` | Student owner | v0.4 approved; creation implemented and independently reviewed |
| 3 | `ta-ticket-queue` | Queue, filters, claim/unclaim, reply, resolve with fix note | `student-tickets` data model | TA owner | v0.1 approved; implemented, reviewed, and accepted 2026-11-09 |
| 4 | `student-ticket-activity` | Dashboard active-ticket cards; owned ticket detail and reply thread; Student reply and close | `student-tickets` data model and creation | Student owner | v0.3 approved; implemented, independently reviewed, and human-verified at 320 CSS pixels |
| 4 | `ai-error-explainer` | Student AI: error explanation, concept, hints only, ticket rewrite | `ai-gateway`, `student-tickets` | Student owner | Not drafted |
| 4 | `ai-ta-assist` | TA AI: Fix Note Drafter and Queue Insights | `ai-gateway`, `ta-ticket-queue` | TA owner | v0.2 approved; implemented, reviewed, and accepted 2026-11-09 (live SoCLaaS test passed) |
| 4 | `bug-faq` | Search anonymised resolved tickets; replaces retired `member-catalog-search` | `ta-ticket-queue` | Student owner | Not drafted |
| 5 | `student-my-tickets` | Paginated owner-scoped Open/Closed ticket lists with status labels and shared dashboard cards | `student-tickets` data model, `student-ticket-activity` dashboard and routes | Student owner | v0.1 approved; implemented, independently reviewed, and committed locally 2026-11-10; Firestore index not deployed |
| 5 | `notifications` | Inbox for claimed, reply, and resolved events | `ta-ticket-queue` | Shared | v0.1 approved |
| 5 | `account-management` | Self-service profile updates; TA student support; Coordinator TA support | `role-based-dashboards` | Shared | v0.1 approved |
| 6 | `session-requests` | *Optional:* student requests and TA approvals of live sessions | `ta-ticket-queue` | Student and TA owners | Not drafted |

Tasks with the same order number may run in parallel once their dependencies
are approved and merged. `member-catalog-search` was retired on 2026-11-08.

## Ownership

Each student owns one complete feature set, plus a share of the team-level work.

| Owner | Feature set |
| --- | --- |
| Student owner (to be confirmed by the team) | `student-tickets`, `ai-error-explainer`, `bug-faq` |
| TA owner (to be confirmed by the team) | `ta-ticket-queue`, `ai-ta-assist` |
| Shared | Role renames, `environments-and-deployment`, `ai-gateway`, `notifications`, `account-management`, documentation, reflections |

## Delivery milestones

1. Approve the `Overview.md` amendment and the role-rename specification drafts.
2. Draft and approve `ai-gateway` and `environments-and-deployment`; implement
   them first because every AI feature and release depends on them.
3. Implement tickets and the queue, then the AI features and Bug FAQ.
4. Implement notifications and account management.
5. Implement optional session requests only if the core features are complete.
6. Update the User Guide, Developer Guide, and reflections to match the release.

## Planned design details

These notes guide the specifications still to be drafted. They are not
approved requirements. When a feature ships and is approved, its description
moves into `docs/DeveloperGuide.md`.

### `ai-gateway`

The single server module through which every AI feature calls the SoC LLM. No
feature calls the LLM directly. The gateway owns:

- Per-user and global rate limits within the SoC LLM per-minute limit, with
  queueing or backoff.
- Timeouts and a non-AI fallback response when the LLM is unavailable.
- Redaction of common secret patterns, such as API keys, before sending code.
- Input-size caps and output-token caps for each feature.
- Validation of AI output against a fixed schema for each feature.
- An `AIUsageRecord` per call, holding token counts and the outcome but no
  prompt or response content.

Context and resource use:

- Put the stable system prompt and fixed instructions first, and the user's
  input last, so the provider can reuse cached prompt prefixes.
- Send only the minimum ticket fields each feature needs.
- Use the token counts in `AIUsageRecord` data for analysis in
  `docs/Reflections.md`.

### AI security controls

Required by `Overview.md`, to be specified and tested in `ai-gateway`,
`ai-error-explainer`, and `ai-ta-assist`:

- Prompt-injection tests: ticket text, code, files, and replies are untrusted.
- Cross-student isolation tests: a student's AI request never includes another
  student's tickets.
- Hint-only tests: the Error Explainer must not return a full solution.
- Schema-validated AI output, with no data change until the authorized user
  confirms.
- Secret redaction before LLM calls.
- Rate-limit, token-cap, timeout, and fallback tests.

### `environments-and-deployment`

- Development runs locally against the Firestore emulator (`demo-codeclinic`);
  production is the cloud project `libconnect-mp4` (spec v0.3).
- Production secrets, including the SoC LLM key, are stored in Firebase Secret
  Manager and never in the repository; developers may keep the key in the
  git-ignored `.env`.
- A GitHub Actions pipeline: tests on each pull request, then a deployment to
  production after CI passes on `main` and a team member approves.

### Refactor during the role-rename tasks

`server/auth/login.js` currently mounts the catalog route and exports the email
helpers. Move route wiring into `server/index.js` and the email helpers into
their own module.

## Amendments

- 2026-11-08: Created for the CodeClinic scope at the human's direction.
- 2026-11-08: Added *Planned design details*, moved from
  `docs/DeveloperGuide.md` at the human's direction so that the Developer Guide
  describes only what is built.
- 2026-11-08: The human chose to implement the CodeClinic code renames (user-visible text, configuration variables, cookie and storage key names, package name, emulator project ID) together with the role-rename implementation of `account-registration`, `role-aware-login`, and `role-based-dashboards`, and to start `ai-gateway` Group 1 only after that rename work.
- 2026-11-08: Updated the environments notes for the approved local-development and single-production-project setup.
- 2026-11-08: To finish faster, the human approved three schedule changes. First, `account-management` AM-G1 and `notifications` N-G1 start before `codeclinic-rename` is fully merged. Second, one independent review covers each wave instead of each group. Third, after Wave 1, one implementer per feature runs that feature's remaining groups back to back, with a single independent review at the end. Critical or High findings still go to the human.
- 2026-11-09: Status update at the human's direction. `ta-ticket-queue` and `ai-ta-assist` are implemented, reviewed and accepted. The human said a teammate has deployed the repo, so `environments-and-deployment` is marked accordingly. The order, dependencies and ownership are unchanged.
