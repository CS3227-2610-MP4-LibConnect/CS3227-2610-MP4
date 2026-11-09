# Analyst handoff: ai-ta-assist

Handoff version: 0.1 (2026-11-09)
Task ID: `ai-ta-assist`
Specification: `workflow/specs/ai-ta-assist.md`, version 0.1 (the human approved it on 2026-11-09)
Checklist: `workflow/tasks/ai-ta-assist/tasks.md`, version 0.1 (the human approved it on 2026-11-09)
Handoff approval evidence: the human replied "approve" to checklist v0.1, its proposed grouping, and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state.

## Scope

Implement T01–T08: the shared helpers, two gateway feature definitions, two
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
  plus new tests under `test/`.
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
- Real SoCLaaS calls or credentials.

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

Acceptance scenarios 1–11 are each cited by at least one task. Real model
quality is checked only by the optional human-run smoke check (T08).

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

## Approval state

Specification v0.1 is human-approved (2026-11-09). Checklist v0.1, its
grouping, and this handoff v0.1 are human-approved (2026-11-09).

## Amendments

- 2026-11-09: Drafted at the human's direction.
- 2026-11-09: The human approved checklist v0.1, the proposed grouping, and handoff v0.1 ("approve").
