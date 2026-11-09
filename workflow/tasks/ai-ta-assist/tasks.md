# Implementation checklist: ai-ta-assist

Version: 0.1 (2026-11-09)
Task ID: `ai-ta-assist`
Specification: `workflow/specs/ai-ta-assist.md`, version 0.1 (the human approved it on 2026-11-09)
Checklist approval evidence: the human replied "approve" to checklist v0.1, its proposed grouping, and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state.

Tasks are in dependency order, with a **human-approved grouping** (drafted inline by
the orchestrator because there are fewer than 10 tasks). Grouping and tasks
are approved together. Tasks in a group run in parallel in separate worktrees;
groups run in order. Checkboxes track implementation only. The orchestrator
marks `[x]` only after independent review. All paths are under
`src/codeclinic/`.

The tests use a **stub gateway** (`{ register, run }`). No task calls the real
SoCLaaS API.

## Group 1: Shared helpers

- [ ] **T01: Shared AI-assist helpers.** Add `server/tickets/ta-ai-shared.js`:
  - `toAiErrorResponse(code, feature)`: the R5 table (status, code, and
    message for each feature).
  - `buildAliasMap(tickets)` and `cleanInsightGroups(groups, aliasMap)`:
    aliases `T1`…`Tn`, dropping unknown aliases and repeats (the first group
    wins), and removing empty groups.
  - `errorSummary(errorOutput)`: the first non-empty line, capped at 160
    characters.
  - `requireEmptyJsonBody`: the same 400 rule as `ta-claims.js` (reuse it if
    exported).

  Later tasks MUST import these and not redefine them. Unit tests cover every
  helper. (Spec R4, R5; scenarios 6, 7, 9.)

## Group 2: Feature definitions (parallel)

- [ ] **T02: Fix Note Drafter definition.** Add
  `server/tickets/ta-ai-fix-note.js`, exporting the `FIX_NOTE_DRAFTER`
  definition: a fixed `systemPrompt`, `buildUserContent`, the caps, and
  `parse`.
  - Unit tests cover the included and excluded fields (no names, emails, IDs,
    `ticketId`, or `repoUrl`; replies labelled by role), and valid and invalid
    `parse` outputs, including the 2000-character cap.
  - Each test passes the definition to `validateFeatureDefinition`.
  - (Spec R1; scenarios 3, 4.)

- [ ] **T03: Queue Insights definition and cache.** Add
  `server/tickets/ta-ai-insights.js`, exporting the `QUEUE_INSIGHTS`
  definition (`systemPrompt`, `buildUserContent` using T01's
  `errorSummary`, caps, `parse`) and `createInsightsCache({ now, ttlMs })`.
  - The cache is keyed by the alias map plus each ticket's `updatedAt`, with a
    5-minute TTL.
  - Unit tests cover the line format and its exclusions, `parse` (0–8 groups,
    field caps, alias pattern), and cache hit, miss, expiry, and invalidation
    when `updatedAt` changes.
  - (Spec R3, R4 cache; scenarios 5, 8.)

## Group 3: Endpoints and UI (parallel)

- [ ] **T04: Draft endpoint and registration.** Add
  `server/tickets/ta-ai-draft-route.js` (`POST /:ticketId/fix-note-draft`),
  mounted with one line in `ta-routes.js`.
  - It reads the gateway from `req.app.locals.aiGateway` when the request
    arrives. If the gateway is missing, it returns `AI_UNAVAILABLE`.
  - Add `registerTaAiFeatures(gateway)`, which registers both T02 and T03.
    Call it with one line in `server/index.js` `startServer()`, right after
    `createAiGateway`.
  - API tests (stub gateway):
    - only the claimer on `CLAIMED`, with 409, 403, 401, and 404 otherwise;
    - CSRF and body checks; each R5 code;
    - a disabled gateway returns 503, and resolving still works;
    - no store writes;
    - the injection fixture changes no state.
  - (Spec R2, R5; scenarios 1, 2, 3, 7, 9, 11.)

- [ ] **T05: Insights endpoint.** Add `server/tickets/ta-ai-insights-route.js`
  (`POST /insights`), mounted with one line in `ta-routes.js`, before
  `/:ticketId`.
  - It collects up to 60 active tickets oldest first through the store.
  - With an empty queue it short-circuits.
  - It maps aliases back with T01, caches results with T03, and returns
    `truncated` and `cached`.
  - API tests (stub gateway): authorization, CSRF, and body checks; the
    alias cleaning; the cache across two TAs; the `truncated` flag; each R5
    code; no writes.
  - (Spec R4, R5; scenarios 5, 6, 7, 8, 9, 11.)

- [ ] **T06: Draft button on the ticket page.** In `src/TATicketPage.tsx`,
  add **Draft with AI** for the claimer of a `CLAIMED` ticket.
  - The draft fills the text area, with the "AI draft" note.
  - The page asks before replacing existing text, and never submits.
  - It shows loading and the R5 messages, as plain text, labelled "AI
    suggestion".
  - Component tests cover visibility, fill without submit, the replace
    prompt, each error message, and HTML or script text shown literally.
  - (Spec R6; scenarios 1, 10.)

- [ ] **T07: Insights panel on the queue page.** In `src/TAQueuePage.tsx`,
  add the **Queue insights** panel with **Generate insights**.
  - It shows groups (label, kind, summary, and ticket links), the
    truncated and cached notes, and empty, loading, and error states. All
    text is plain.
  - Component tests cover each state, plain-text rendering, ticket links, and
    320 px.
  - (Spec R6; scenarios 8, 10.)

## Group 4: Guides and evidence

- [ ] **T08: Guides and evidence.** Update `docs/UserGuide.md` (both TA AI
  features, the advisory nature, and the "don't paste secrets" warning from
  `ai-gateway` R6) and `docs/DeveloperGuide.md` (the modules, registration,
  the endpoints, the cache, and the alias design).
  - Run the full suite and the build.
  - Record a **human-run** manual smoke check with the real key in local
    development, if the human chooses to do one, without prompt or response
    text.
  - The orchestrator writes `implementation-report.md` and the token table.

## Approval boundary

Checklist v0.1, the grouping, and handoff v0.1 are human-approved
(2026-11-09). Test writing, dispatch, review, commit, and merge are separate human
decisions.

## Amendments

- 2026-11-09: Drafted at the human's direction after the human approved
  specification v0.1. The grouping was proposed inline by the orchestrator.
- 2026-11-09: The human approved checklist v0.1, the proposed grouping, and handoff v0.1 ("approve").
