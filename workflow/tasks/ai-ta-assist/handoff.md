# Analyst handoff: ai-ta-assist

Handoff version: 0.7 (2026-11-10)
Task ID: `ai-ta-assist`
Specification: `workflow/specs/ai-ta-assist.md`, version 0.3 (human-approved 2026-11-09)
Checklist: `workflow/tasks/ai-ta-assist/tasks.md`, version 0.7 (human-approved 2026-11-10)
Handoff approval evidence: the human replied "approve" to checklist v0.1, its proposed grouping, and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state. The human's "ok" on 2026-11-09 authorised the v0.2 edits; v0.2 is human-approved: the human chose "Approve both (Recommended)" on 2026-11-09, recorded from the human's answer. v0.3 is human-approved: the human chose "Fix all now (Recommended)" on 2026-11-09. v0.4 is human-approved: the human chose "Approve both rounds (Recommended)" on 2026-11-09. v0.5 was approved by the human's "do the two better things" on 2026-11-10. v0.6 was approved by the human's "continue improve" on 2026-11-10. v0.7 was approved by the human's "improve the prompt to fix" on 2026-11-10.

## Scope

Implement T01–T12 (T10–T12 are the review follow-ups): the shared helpers, two gateway feature definitions, two
TA-only endpoints, the UI on the existing TA pages, and the guides.

Out of scope:

- Any change to the gateway (`server/ai/`).
- Storing drafts or insights.
- Student AI features.
- Code files or `repoUrl` in insights.

## Preflight

- Read `AGENTS.md`, `workflow/README.md`, this handoff, the task's checklist
  item, and only the spec sections it cites, plus "Glossary" and "Actors and
  trust boundaries". Verify versions and approval lines.
- Work in a worktree the orchestrator creates from `TA-coordinator`, and check
  the base with `git log -1`. Do not run `npm install`/`ci`: `node_modules` is
  symlinked.
- Skills are at `.agents/skills/` (tracked). `.claude/skills/` does not exist
  in worktrees.

## How the gateway reaches the routes (read before T04 or T05)

`startServer()` in `server/index.js` builds the app with `createServerApp()`
and **then** sets `app.locals.aiGateway = createAiGateway(...)`. So:

- routes read `req.app.locals.aiGateway` when the request arrives, never at
  construction;
- feature registration (`registerTaAiFeatures(gateway)`) is one line in
  `startServer()` after `createAiGateway`;
- tests attach a stub with `app.locals.aiGateway = stub`.

The gateway API: `register(definition)` validates with
`validateFeatureDefinition` (`server/ai/features.js`). `run({ feature, actor,
input })` resolves to `{ ok: true, data }` or `{ ok: false, code }`. The
gateway already redacts input, builds the two-message prompt with
`SHARED_PREAMBLE`, enforces the caps and rate limits, and writes `aiUsage`.
Features must not repeat any of that.

## Allowed files

- New files: `server/tickets/ta-ai-shared.js`, `ta-ai-fix-note.js`,
  `ta-ai-insights.js`, `ta-ai-draft-route.js`, and `ta-ai-insights-route.js`,
  plus new tests under `test/`, including T09's
  `test/ta-ai-live-soclaas.integration.test.js`.
- Review follow-ups (v0.3): T10 edits `server/tickets/ta-ai-insights.js` and adds
  `test/ta-ai-insights.cache-prune.test.js`. T11 edits `src/TAQueuePage.tsx`
  and adds `test/TAQueuePage.ai-empty.test.tsx`. T12 edits
  `test/ta-ai-live-soclaas.integration.test.js` to strengthen it only.
- One-line edits:
  - `server/tickets/ta-routes.js`: one mount line each for T04 and T05.
    Insights goes before `/:ticketId`.
  - `server/index.js` (T04 only): the registration line in `startServer()`.
- `src/TATicketPage.tsx` and `.css` (T06), and `src/TAQueuePage.tsx` and
  `.css` (T07).
- Exports only, no behaviour change: `ta-claims.js` (if T01 needs its body
  check).
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, and this task's evidence
  files.

Not allowed:

- `server/ai/*`, any other feature's files, or existing tests.
- New dependencies, CI or deployment config, `firebase.json`.
- Real SoCLaaS calls or credentials by any agent. Agents must not read `.env`
  or set `RUN_SOCLAAS_TESTS`.

**Stage files by explicit path only** (never `git add -A` or `git add .`).

## Trusted and untrusted inputs; authorization

- **Trusted:** the session actor (reloaded on every request by the existing
  guards), the ticket's `status` and `claimedByTaId` from the store, and the
  server-built alias map.
- **Untrusted:** all ticket content and **all model output**. Model output
  never changes state. Insight ticket references outside the alias map are
  dropped.
- **Never in prompts:** names, emails, user IDs, real `ticketId`s,
  `repoUrl`, and session or CSRF data.
- **Plain text only** in the UI. No `dangerouslySetInnerHTML`, and AI text is
  never turned into links.

## Permissions and tools

- **Allowed:** `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false` and `npm run build`.
- **Not needed:** the emulator. There are no store changes.
- **Long-lived tools:** if one is started anyway, use stdin `</dev/null`, a
  timeout, and check that port 8080 is free afterwards.
- **Not allowed:** network access, real keys, push, merge, deploy, or
  messages.
- **Human only (T09):** the live run, for example `RUN_SOCLAAS_TESTS=1 CI=true npx
  react-scripts test --roots test --testMatch '**/test/**/*.test.*'
  --watchAll=false ta-ai-live`, with the human's credentials in the
  gitignored `src/codeclinic/.env`. Agents verify only that the suite skips.

## Selected skills

- `openspec-apply-change` (preflight, adapted to `workflow/` paths; no
  OpenSpec CLI).
- `seedu-git-standard` for commits, with no AI attribution.

## Test matrix

| Layer | Tasks |
| --- | --- |
| Unit | T01–T03 |
| API (stub gateway) | T04–T05 |
| UI | T06–T07 |
| Live (opt-in, human-run) | T09 |

Acceptance scenarios 1–11 are each cited by at least one task. Real-model
shape and safety are checked by T09 when the human runs it. Output quality
is judged by the human.

## Shared-file collisions (for grouping)

- `ta-routes.js` gets one mount line each from T04 and T05, both in Group 3.
  T04 adds its line above the `/:ticketId` route and T05 adds its line first,
  directly after the existing claims and replies mounts. The orchestrator
  resolves the adjacent-line conflict when merging, as in `ta-ticket-queue`.
- `server/index.js` is edited only by T04.
- T06 and T07 edit different page files.
- T02 and T03 are separate new files; both import T01.

## Known risks

- The SoCLaaS `max_tokens` support and model value (`ai-gateway` open
  decisions 2–3) may affect real-output behaviour. This is not testable
  locally.
- The insights cache is per server instance. With several instances, each
  has its own cache. That is harmless, but the savings are smaller.
- Production prompts depend on the `SOCLAAS_*` production secrets
  (`environments-and-deployment`). If they are missing, both features return
  `AI_UNAVAILABLE` by design.

- **Live test (T09):**
  - Each human run uses real quota (at most 4 calls) and counts toward the
    gateway rate limits.
  - Model output varies between runs, so the test asserts shape and safety
    only.
  - `react-scripts test` loads `src/codeclinic/.env` on every test run, so the
    key is in `process.env` during all test runs. Existing tests build their
    own config objects. A reviewer should confirm that no test logs or
    snapshots `process.env`.

## Approval state

Specification v0.1, checklist v0.1, its grouping, and handoff v0.1 are
human-approved (2026-11-09). Specification v0.2, checklist v0.2, its grouping,
and this handoff v0.2 are human-approved: the human chose "Approve both (Recommended)" on 2026-11-09, recorded from the human's answer.

## Amendments

- 2026-11-09: Drafted at the human's direction.
- 2026-11-09: The human approved checklist v0.1, the proposed grouping, and handoff v0.1 ("approve").
- 2026-11-09 (v0.2): Following spec v0.2, the human replied "ok" to the orchestrator's proposal. Added the T09 live-test file to the allowed files, the human-only live-run permission, and the live-test risks. Agents still may not read `.env`, use credentials, or run the live test.
- 2026-11-09: The human approved the v0.2 text ("Approve both (Recommended)"), together with the T01–T07 tests.
- 2026-11-09 (v0.3): The human chose "Fix all now (Recommended)" after the independent review (pass with follow-up, F1–F4 Low) on 2026-11-09. T10–T12 were added to the allowed files. T12 may edit `test/ta-ai-live-soclaas.integration.test.js` to strengthen its budget assertion; it may not weaken any assertion. All other rules are unchanged.
- 2026-11-09: The approval-evidence line now records the v0.3 approval (re-review note N2). No content change.
- 2026-11-09 (v0.4): The human asked for "2 rounds of improvement-testing-improvement-testing" after the pre-PR check, and chose "Approve both rounds (Recommended)" on 2026-11-09. Added T13–T16. Allowed narrow test edits: the insights `AI_INVALID_OUTPUT` text in `test/TAQueuePage.ai.test.tsx` and `test/helpers/ta-ai-harness.js` (spec v0.3 R5). Round 2 has the same limits: no change to authorization, the data sent to the model, parsers, or the gateway.
- 2026-11-09: v0.4 was added to the approval-evidence line (rounds review R3). No content change.
- 2026-11-10 (v0.5): After 5 more live runs on the PR code, the human said "do the two better things" on 2026-11-10. Added T20–T21, with the same limits as rounds 1–2: prompt wording and tests only, and no change to authorization, `buildUserContent`, parsers, caps, routes, or the gateway.
- 2026-11-10 (v0.6): After the round 3 summary, the human asked to "continue improve" the still partly open item (drafts inferring a cause for displayed HTML) on 2026-11-10. Added T22, with the same limits as rounds 1–3: prompt wording and tests only, and no change to authorization, `buildUserContent`, parsers, caps, routes, or the gateway.
- 2026-11-10: The round 4 review passed with follow-up (R4-1, Low), and the human chose "Fix R4-1, then commit (Recommended)" on 2026-11-10. Added T23 (prompt wording and tests only).
- 2026-11-10 (v0.7): After round 4, the human said "improve the prompt to fix" the two remaining advisory notes (R4b-1: a guessed cause framed as a check; R4b-2: a detail not in the ticket) on 2026-11-10. Added T24, with the same limits: prompt wording and tests only.
- 2026-11-10: Added T25 (a final self-check line, prompt wording and tests only) to Group 11 as a follow-up to T24 under the human's "improve the prompt to fix". Explicit human confirmation of T25 is pending (round 5 review R5-1).
- 2026-11-10: T25 was explicitly confirmed when the human chose "Confirm T25, commit + push (Recommended)" on 2026-11-10 (round 5 review R5-1 resolved).
