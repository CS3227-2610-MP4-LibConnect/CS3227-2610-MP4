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
| 1 | `account-registration` | Student/TA registration (role rename) | — | Shared | v0.6 approved |
| 1 | `role-aware-login` | Student/TA login (role rename) | — | Shared | v0.3 approved |
| 1 | `role-based-dashboards` | Student/TA dashboards (role rename) | `role-aware-login` | Shared | v0.5 approved |
| 2 | `environments-and-deployment` | Separate dev and prod Firebase projects, per-environment secrets, GitHub Actions CI/CD | — | Shared | v0.1 approved |
| 2 | `ai-gateway` | Shared SoC LLM client: rate limits, timeouts, schema validation, redaction, token caps, fallback, usage records | — | Shared | v0.1 approved; design input in `workflow/tasks/ai-gateway/design.md` |
| 3 | `student-tickets` | Create, edit, close, view tickets; files; reply thread | `role-based-dashboards` | Student owner | Not drafted |
| 3 | `ta-ticket-queue` | Queue, filters, claim/unclaim, reply, resolve with fix note | `student-tickets` data model | TA owner | Not drafted |
| 4 | `ai-error-explainer` | Student AI: error explanation, concept, hints only, ticket rewrite | `ai-gateway`, `student-tickets` | Student owner | Not drafted |
| 4 | `ai-ta-assist` | TA AI: Fix Note Drafter and Queue Insights | `ai-gateway`, `ta-ticket-queue` | TA owner | Not drafted |
| 4 | `bug-faq` | Search anonymised resolved tickets; replaces retired `member-catalog-search` | `ta-ticket-queue` | Student owner | Not drafted |
| 5 | `notifications` | Inbox for claimed, reply, and resolved events | `ta-ticket-queue` | Shared | Not drafted |
| 5 | `account-management` | Self-service profile updates; TA student support; Coordinator TA support | `role-based-dashboards` | Shared | Not drafted |
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

- A separate development Firebase project, alongside the production project.
- Separate secrets for each environment, including SoC LLM credentials, stored
  as GitHub and Firebase secrets and never in the repository.
- A GitHub Actions pipeline: tests on each pull request, deployment to
  development, then a manually approved deployment to production.

### Refactor during the role-rename tasks

`server/auth/login.js` currently mounts the catalog route and exports the email
helpers. Move route wiring into `server/index.js` and the email helpers into
their own module.

## Amendments

- 2026-11-08: Created for the CodeClinic scope at the human's direction.
- 2026-11-08: Added *Planned design details*, moved from
  `docs/DeveloperGuide.md` at the human's direction so that the Developer Guide
  describes only what is built.
