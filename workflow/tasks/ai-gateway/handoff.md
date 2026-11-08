# Analyst handoff: AI gateway

Handoff version: 0.1 (2026-11-08)
Task ID: `ai-gateway`
Specification: `workflow/specs/ai-gateway.md`, version 0.1 (human-approved 2026-11-08)
Checklist: `workflow/tasks/ai-gateway/tasks.md`, version 0.1 (human-approved 2026-11-08)
Design input: `workflow/tasks/ai-gateway/design.md` (MP3 design; subordinate to the specification)
Handoff approval evidence: the human replied "approve the checklist and handoff" to version 0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

`workflow/templates/handoff.md` is absent. This handoff follows the required fields in `workflow/README.md`.

## Scope

Implement T01–T09: the gateway framework under `src/codeclinic/server/ai/`, the shared rate-counter extraction, and server startup wiring. No AI feature is registered, and no route, prompt, schema, or UI for the Error Explainer, Fix Note Drafter, or Queue Insights is in scope. Those belong to `ai-error-explainer` and `ai-ta-assist`.

## Implementation preflight

- Read `AGENTS.md`, `workflow/README.md`, the approved specification, this handoff, and the checklist from disk. Verify the versions and approval states above, and stop if any is missing, stale, unapproved, contradictory, or ambiguous.
- Use `.agents/skills/openspec-apply-change/SKILL.md` for preflight, adapted to the canonical `workflow/specs/` and `workflow/tasks/` layout.
- Work in a separate branch or worktree, for example `ai-gateway-impl`, created from the branch holding the approved specification.

## Allowed files

- New files under `src/codeclinic/server/ai/`.
- New `src/codeclinic/server/shared/firestore-rate-counter.js` (T06).
- `src/codeclinic/server/auth/firestore-store.js`, only to delegate its counter methods to the shared module, with unchanged behavior (T06).
- `src/codeclinic/server/index.js`, only to create the gateway at startup (T08).
- New tests under `src/codeclinic/test/`. Existing tests must not be edited.
- `workflow/tasks/ai-gateway/implementation-report.md` and `logs/tasks/ai-gateway/`.

Not in scope: `package.json` or the lockfile (no new dependencies), React source under `src/codeclinic/src/`, other server modules, App Hosting or Firebase configuration, CI, Firestore rules, and documentation. If a change outside these files seems necessary, stop and ask.

## Trusted and untrusted inputs

- **Trusted:** server environment configuration, and the `actor` that the calling feature resolved from the server session.
- **Untrusted:** all feature input content and all provider responses, including status codes, headers, and bodies.
- **Secret:** `SOCLAAS_API_KEY`. It must never appear in logs, errors, results, usage records, test fixtures, snapshots, or evidence. Tests use an obviously fake value such as `test-key-not-real`.

## Authorization rules

- The gateway does not authenticate users or check roles; features must do that before calling `run`. The gateway must never accept identity, role, or model from feature input.
- Model output never triggers a write other than the usage record, and no tool calling exists.
- Rate-limit and usage writes are keyed by the trusted `actor.userId` only. Both the registered feature and the server-resolved actor must validate before usage recording; invalid actors return `AI_UNAVAILABLE` without provider calls or a fabricated audit identity.

## Permissions, tools, and external access

- Allowed: read the repository, edit allowed files, and run `npm test` and `npm run build` in `src/codeclinic`. The Firestore emulator may be used for an opt-in integration test following the existing `RUN_FIRESTORE_EMULATOR_TESTS` pattern.
- Not allowed: any network call to SoCLaaS or another external service, reading or requesting a real API key, installing packages, pushing, deploying, or merging.

## Selected skills

- `openspec-apply-change`: implementation preflight (path-adapted).
- `firebase-firestore`: reference only, for transaction patterns in T06 and T07.
- `seedu-git-standard`: commit message format, if the human later approves a commit.

## Test matrix

| Task | Required tests |
| --- | --- |
| T01 | Valid, missing, malformed, and out-of-range configuration; disabled reason contains no key |
| T02 | Each R6 pattern; near misses; multi-line keys; cap boundary; no truncation |
| T03 | Registry validation; unknown feature; stable system message; delimiter containment |
| T04 | Request shape; timeout; retry only on retryable failures; `Retry-After`; circuit breaker open and reset |
| T05 | Each parsing case in spec scenario 10 |
| T06 | Global and per-user limits; user isolation; store failure fails closed; existing auth tests pass unchanged |
| T07 | Record shape; `null` tokens; swallowed write failure; no content fields |
| T08 | End-to-end pipeline with fakes; disabled gateway; every result code; no secrets or content in output |
| T09 | Browser boundary test; full suite and build |

## Known risks

- The `max_tokens` support and the `SOCLAAS_MODEL` value are unconfirmed (spec open decisions 2 and 3). Tests use fakes, so neither blocks implementation. The human confirms both during the manual smoke check.
- Extracting the shared counter (T06) touches working auth code. The existing auth tests are the regression guard and must pass without edits.
- Redaction patterns can miss secrets. The User Guide must still warn users not to paste secrets; that change belongs to the feature tasks.

## Evidence

Record the implementation report and factual logs as required by `workflow/README.md`, including the *Subagent token usage* table. Never estimate token counts.

## Approval state

Specification v0.1: human-approved on 2026-11-08. Checklist v0.1 and this handoff v0.1: human-approved on 2026-11-08. Subsequent human grouping approval evidence is recorded in `tasks.md`; application evidence is in `logs/tasks/ai-gateway/grouping-application.md`. Implementation dispatch, review findings, commit message, merge, and push remain pending separate human decisions.

## Amendments

- 2026-11-08: The human approved renaming the application directory from `src/libconnect-mp4` to `src/codeclinic`. Path references in this handoff were updated; scope and allowed files are otherwise unchanged.

- 2026-11-08: The human selected **Approve the clarification** in the continuation chat for R4/R11, this checklist and the handoff: per-user usage records require both a registered feature and a valid server-resolved actor. Invalid actors return AI_UNAVAILABLE without provider calls or fabricated audit identities. This records the human-approved wording clarification; gateway behavior is unchanged.
