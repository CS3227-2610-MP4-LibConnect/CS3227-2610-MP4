# Implementation checklist: ai-ta-assist

Version: 0.3 (2026-11-09)
Task ID: `ai-ta-assist`
Specification: `workflow/specs/ai-ta-assist.md`, version 0.2 (v0.1 human-approved 2026-11-09; v0.2 human-approved: the human chose "Approve both (Recommended)" on 2026-11-09, recorded from the human's answer)
Checklist approval evidence: the human replied "approve" to checklist v0.1, its proposed grouping, and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state. The human's "ok" on 2026-11-09 authorised the v0.2 edits (T09 and the regrouping). Checklist v0.2 is human-approved: the human chose "Approve both (Recommended)" on 2026-11-09, recorded from the human's answer. Checklist v0.3 (Group 6, review follow-ups) was approved when the human chose "Fix all now (Recommended)" on 2026-11-09.

Tasks are in dependency order, with a **human-approved grouping** (v0.2 regrouping approved 2026-11-09) (drafted inline by
the orchestrator because there are fewer than 10 tasks). Grouping and tasks
are approved together. Tasks in a group run in parallel in separate worktrees;
groups run in order. Checkboxes track implementation only. The orchestrator
marks `[x]` only after independent review. All paths are under
`src/codeclinic/`.

The tests use a **stub gateway** (`{ register, run }`). No task calls the real
SoCLaaS API, except T09's opt-in live test, which only the human runs.

## Group 1: Shared helpers

- [x] **T01: Shared AI-assist helpers.** Add `server/tickets/ta-ai-shared.js`:
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

- [x] **T02: Fix Note Drafter definition.** Add
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

- [x] **T04: Draft endpoint and registration.** Add
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

- [x] **T05: Insights endpoint.** Add `server/tickets/ta-ai-insights-route.js`
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

- [x] **T06: Draft button on the ticket page.** In `src/TATicketPage.tsx`,
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

## Group 4: Live verification

- [ ] **T09: Opt-in live SoCLaaS test.** Add
  `test/ta-ai-live-soclaas.integration.test.js`, following spec v0.2 "Live
  verification".
  - It is gated on `RUN_SOCLAAS_TESTS === '1'` **and** an enabled
    `loadAiConfig(process.env)`. Otherwise it uses `test.skip`, like the
    emulator suites.
  - It uses the real `createAiGateway`, an in-memory store with synthetic
    tickets, a stub `db` for `aiUsage`, and `registerTaAiFeatures`. It makes
    at most 4 provider calls.
  - It asserts shape and safety only: draft length, alias-valid insights, the
    injection ticket, no store change, and `aiUsage` writes.
  - **The agent only checks that it skips** without the flag. It must not read
    `.env` or run the live mode. The human runs it, and the orchestrator
    records only the date, counts, model, and tokens.
  - (Spec v0.2 Live verification; scenarios 1, 3, 5, 6, 11.)

## Group 5: Guides and evidence

- [ ] **T08: Guides and evidence.** Update `docs/UserGuide.md` (both TA AI
  features, the advisory nature, and the "don't paste secrets" warning from
  `ai-gateway` R6) and `docs/DeveloperGuide.md` (the modules, registration,
  the endpoints, the cache, and the alias design).
  - In the Developer Guide, document the T09 setup: the `.env` variables
    (`SOCLAAS_API_KEY`, `SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, and optionally
    `AI_GLOBAL_LIMIT_PER_MINUTE`) and the `RUN_SOCLAAS_TESTS=1` command,
    with no real values.
  - Run the full suite and the build.
  - Record a **human-run** manual smoke check with the real key in local
    development, if the human chooses to do one, without prompt or response
    text.
  - The orchestrator writes `implementation-report.md` and the token table.

## Group 6: Review follow-up (parallel)

- [ ] **T10: Prune expired insights-cache entries (review F1).** In
  `server/tickets/ta-ai-insights.js`, `createInsightsCache` removes expired
  entries when `set` is called, so the cache cannot grow without bound.
  - Add unit tests in a new `test/ta-ai-insights.cache-prune.test.js`: entries
    set before the TTL are removed on a later `set`, and live entries are kept.
  - (Spec R4 cache.)

- [ ] **T11: Correct the empty insights message (review F2).** In
  `src/TAQueuePage.tsx`, show "No insights: there are no active tickets to
  group." only when `ticketCount === 0`. When there are tickets but no groups,
  show "No common patterns found."
  - Add UI tests in a new `test/TAQueuePage.ai-empty.test.tsx` covering both
    cases.
  - (Spec R6; scenario 6.)

- [ ] **T12: Count real provider requests in the live test (review F3).** In
  `test/ta-ai-live-soclaas.integration.test.js`, count actual `fetch` calls
  (by wrapping the `fetch` passed to the real gateway) and assert at most 4
  per run, including retries.
  - The agent verifies only that the suite skips. It does not read `.env` or
    run the live mode.
  - (Spec v0.2 Live verification.)

## Approval boundary

Checklist v0.1, its grouping, and handoff v0.1 are human-approved
(2026-11-09). Checklist v0.2, its grouping, and handoff v0.2 are human-approved: the human chose "Approve both (Recommended)" on 2026-11-09, recorded from the human's answer. Checklist v0.3 (Group 6) and handoff v0.3 were approved by the human's "Fix all now (Recommended)" on 2026-11-09. Test writing, dispatch, review, commit, and merge are separate human
decisions.

## Amendments

- 2026-11-09: Drafted at the human's direction after the human approved
  specification v0.1. The grouping was proposed inline by the orchestrator.
- 2026-11-09: The human approved checklist v0.1, the proposed grouping, and handoff v0.1 ("approve").
- 2026-11-09 (v0.2): Following spec v0.2, the human replied "ok" to the orchestrator's proposal. Added T09 (the opt-in live SoCLaaS test) as a new Group 4. The guides group (T08) is renumbered to Group 5, with its wording unchanged except for one added sub-bullet on the live-test setup. T01–T07 are unchanged.
- 2026-11-09: The human approved the v0.2 text ("Approve both (Recommended)"), together with the T01–T07 tests.
- 2026-11-09 (v0.3): The human chose "Fix all now (Recommended)" after the independent review (pass with follow-up, F1–F4 Low) on 2026-11-09. Added Group 6: T10 (F1), T11 (F2) and T12 (F3). F4 (`implementation-report.md`) is orchestrator work. The orchestrator ticked T01, T02, T04, T05 and T06, which the review verified with no findings. T03, T07, T08 and T09 stay open until their follow-ups are verified. Existing task wording is unchanged.
