# Review report: ai-ta-assist (T01–T09)

Reviewer: independent reviewer agent (did not implement this work). Date: 2026-11-09.
Review approved by the human on 2026-11-09. This report is an assessment, not merge approval.
Execution log: `logs/tasks/ai-ta-assist/18-reviewer.md`. Security review: `security-review.md`.

## Versions and approvals checked

| Artifact | Version | Approval line |
| --- | --- | --- |
| `workflow/specs/ai-ta-assist.md` | 0.2 | Present: v0.1 "alright, lets use v0.1 for now"; v0.2 "Approve both (Recommended)", recorded from the human |
| `workflow/tasks/ai-ta-assist/tasks.md` | 0.2 | Present: v0.1 "approve"; v0.2 "Approve both (Recommended)" |
| `workflow/tasks/ai-ta-assist/handoff.md` | 0.2 | Present, same wording |
| `workflow/specs/ai-gateway.md` | 0.1 | Context only (trust boundaries, R6, R8, R10) |

No `design.md` or `proposal.md`. All checklist boxes are still `[ ]`, as the protocol requires.

## Diff examined

`git diff 9f34c4e..8946830` (53 files, +3064/−28), in a clean detached worktree at `8946830`, commit by commit:
`56d0bdd` (docs v0.2), `eb49679` (test contract), `6ea07a4` T01, `a69f2e0` T02, `f88ddf6` T03,
`064aada` T04, `d6ce524` T05, `aabb65c` T06, `6dad099` T07, `7be00bc` T09, `c91ff81` T09 fix,
`6553fb0` evidence, `8946830` T08.

- Production changes stay within the handoff's allowed files. `server/ai/*` is untouched. `ta-claims.js` only adds an export. `ta-routes.js` gets two `require` lines and two mount lines; `server/index.js` gets one `require` line and one call line. No dependencies, CI or deployment config change.
- **Test changes after `eb49679`:** `git diff --stat eb49679..8946830 -- src/codeclinic/test` shows only two added files: `test/ta-ai-live-soclaas.integration.test.js` (T09) and `test/helpers/live-fetch-environment.js` (`c91ff81`). In `c91ff81` the live test changes one line, its `@jest-environment` docblock. The T01–T07 test files are byte-identical to the test contract. **No assertion was weakened or removed.**
- `live-fetch-environment.js` only copies the host's `fetch` and web helpers into the Jest context when they are missing. It uses `jest-environment-node`, which is already installed through react-scripts. It has no production effect.
- Accepted deviation (T07): the filter label "Concept" was renamed "Concept tag". It is recorded in `implementation-T07.md`, and the User Guide was updated to match.

## Verification (exact results in the log)

| Command (from `src/codeclinic`) | Result |
| --- | --- |
| Full suite at `8946830`, before review tests | Test Suites: 5 skipped, 55 passed, 55 of 60 total; Tests: 9 skipped, 1212 passed, 1221 total; exit 0 |
| Review-only file `ta-ai-assist.review` | 9 passed, 9 total |
| Full suite with the review file | Test Suites: 5 skipped, 56 passed, 56 of 61 total; Tests: 9 skipped, 1221 passed, 1230 total; exit 0 |
| `ta-ai-live` without the flag | Tests: 5 skipped, 5 total |
| `npx tsc --noEmit -p .` | exit 0, no output |
| `npm run build` | exit 0, "Compiled successfully." |

The live mode was not run. `RUN_SOCLAAS_TESTS` was not set, no `.env` exists in the worktree, and no `.env` was read.

## Criterion traceability

| Criterion | Implementation | Tests | Status |
| --- | --- | --- | --- |
| R1 drafter registration | `ta-ai-fix-note.js` | `ta-ai-fix-note.test.js`; review: input keys, forged role | Met |
| R2 draft endpoint | `ta-ai-draft-route.js:57-81` | `ta-ai-draft-route.api.test.js` (409×4, 404, 403, 401, CSRF, 400×3) | Met |
| R3 insights registration | `ta-ai-insights.js:11-74` | `ta-ai-insights.test.js`; review: line forging | Met |
| R4 insights endpoint and cache | `ta-ai-insights-route.js`, `ta-ai-insights.js:84-103` | `ta-ai-insights-route.api.test.js`, cache unit tests; review: Timestamp keys | Met; see F1 |
| R5 error mapping | `ta-ai-shared.js:5-36` | shared, both API suites, both UI suites; review: thrown and unknown codes | Met |
| R6 UI | `TATicketPage.tsx`, `TAQueuePage.tsx` | `TATicketPage.ai`, `TAQueuePage.ai` | Met; see F2. 320 px checked through CSS source only |
| Scenario 1 (draft fills, no save) | route writes nothing; UI never submits | draft API "no writes"; UI "never submits" | Met |
| Scenario 2 (409/403/401) | route lines 62-64 plus the guards | draft API | Met |
| Scenario 3 (injection, no state change) | no write path | API injection tests (both endpoints), live injection test | Met |
| Scenario 4 (prompt privacy) | `toDraftInput`, `buildUserContent` | draft API "what the model sees"; review input keys | Met |
| Scenario 5 (insights lines, ≤60) | route `collectActive`, `buildUserContent` | insights API, unit tests | Met |
| Scenario 6 (alias cleaning, 502) | `cleanInsightGroups` | shared, insights API | Met |
| Scenario 7 (R5 mapping, disabled gateway, resolve works) | shared, routes | both API suites, including a real disabled gateway | Met |
| Scenario 8 (cache) | cache plus route key | insights API (two TAs, `updatedAt`, new ticket) | Met |
| Scenario 9 (CSRF 403, body 400) | `requireCsrf`, `requireEmptyJsonBody` | both API suites | Met |
| Scenario 10 (literal rendering) | React text nodes; links from server IDs only | both UI suites | Met |
| Scenario 11 (one usage record per call) | gateway (unchanged) | stub `run` call counts; live `aiUsage` writes | Met |
| Live verification (v0.2) | `ta-ai-live-soclaas.integration.test.js` | skip verified by reviewer; human live run 4: 4/4 passed (log 15) | Met; see F3 |
| T01–T07 | as above | as above | Satisfied |
| T08 guides and evidence | `docs/UserGuide.md`, `docs/DeveloperGuide.md` | docs checked against the code (accurate) | Partly done; see F4 |
| T09 live test | as above | as above | Satisfied; see F3 |

## Findings

No Critical, High or Medium findings.

| ID | Severity | Location | Evidence | Requirement or risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| F1 | Low | `server/tickets/ta-ai-insights.js:84-103` | An expired entry is deleted only when the same key is read again. Every queue change creates a new key, and old keys are never read, so the `entries` Map grows without bound for the life of the process. The growth is limited only by the number of successful gateway calls, which the rate limit caps. | R4 "resource-aware" cache; memory on a long-running instance | Sweep expired entries in `set` (or cap the size, for example to the latest N keys). Add a unit test. Follow-up; not a blocker. |
| F2 | Low | `src/TAQueuePage.tsx:197` | Every result with `groups: []` shows "No insights: there are no active tickets to group." That includes a non-empty queue where the model returned no groups, or where cleaning removed every group. The text is then false. | R6 empty state; TA clarity | Use the empty-queue text only when `ticketCount === 0`; otherwise show, for example, "No common patterns found." Add a UI test. |
| F3 | Low | `test/ta-ai-live-soclaas.integration.test.js:84-128` | The budget counts endpoint calls (3), not provider HTTP requests. The transport retries once (`ai-gateway` R8), so a failing provider can get up to 6 requests in a run. Log 15 runs 2 and 3 show `attempts 2` per call. | Spec v0.2 "at most 4 provider calls per run" | Either count real `fetch` calls in the live test (wrap the global `fetch` in the environment) and assert ≤ 4, or clarify in the spec that "provider call" means a gateway call. Spec clarification needs human approval. |
| F4 | Low (evidence) | `workflow/tasks/ai-ta-assist/` | T08 says "The orchestrator writes `implementation-report.md` and the token table." That file does not exist at `8946830`. | T08 checklist item; AGENTS.md evidence | The orchestrator should add `implementation-report.md` with the token table before merge. T08 should not be marked `[x]` until then. |
| I1 | Info | `server/tickets/ta-ai-shared.js:75` | The 400 body is `{ message: 'This request does not take a body.' }`, not `MESSAGES.INVALID`. The spec fixes only the status, and the UI does not show this text. | Consistency | Optional: reuse `messages.INVALID`. |
| I2 | Info | `ta-ai-shared.js:32-33` | An unknown gateway code maps to `503 AI_UNAVAILABLE`, and the unknown code is not echoed (review test). | R5 safe fallback | None. This is the safe choice. |
| I3 | Info | `ta-ai-draft-route.js:14` | The 409 text is a duplicate constant, identical to the text in `ta-claims.js`. | Maintainability | Optional: export and reuse it. |
| I4 | Info | `ta-ai-insights-route.js:40` | The cache key adds `truncated` to the spec's alias-map and `updatedAt` key. That is stricter and correct, and the Developer Guide documents it. | R4 | None. |
| I5 | Info | `TATicketPage.tsx:185` | The replace prompt uses `window.confirm`. If dialogs are suppressed, it returns false and the text is kept, which is the safe default. | R6 UX | Optional: use an in-page confirm, matching the resolve flow. |
| I6 | Info | `TAQueuePage.tsx:45` | The queue page's `AI_INVALID_OUTPUT` message says "write the note yourself". That is the spec's R5 wording, but it reads oddly for insights. | Spec wording | Optional spec amendment (human decision). |
| I7 | Info | `workflow/tasks/ai-ta-assist/spec.md`, `test-coverage-report.md` | The link file still says spec v0.1, and the coverage report header says v0.1, although tests were approved with v0.2. Neither was changed in this range. | Evidence hygiene | Update the version references. |

## Unverified or indirectly verified criteria

- **320 px layout (R6):** checked only through CSS source assertions (`@media (max-width: …)`, `overflow-wrap`, `min-width: 0`). It was not rendered in a browser.
- **Output usefulness:** not provable automatically. Judging it is the human's call (spec matrix).
- **Live behaviour:** the reviewer did not run it, by rule. It is accepted from the human's live run 4 (log 15): 4 passed, model recorded as the human's choice. Token counts unavailable.
- **Firestore store paths:** the cache key with a Firestore `Timestamp` `updatedAt` is covered only by review unit tests with Timestamp-like objects, not by the emulator.

## Review-only tests (uncommitted)

- `src/codeclinic/test/ta-ai-assist.review.test.js`: 9 tests, all passing:
  - a thrown or unknown gateway result gives the fixed body, with no leak;
  - `ok` without a string draft gives 502;
  - the drafter input key allow-list, and a forged reply `authorRole` ignored (the role comes from the account);
  - the insights input key allow-list;
  - newlines and ` | ` in the title cannot forge prompt lines or fields;
  - the insights response has no private fields;
  - Timestamp-like and `{ seconds, nanoseconds }` cache keys.

## Verdict

**Pass with follow-up.**

- Authorization, CSRF and the body checks are enforced on the server from the session actor and the stored ticket.
- AI output never changes state. It is rendered as plain text, and the ticket links come only from server-mapped IDs.
- The prompt inputs exclude names, emails, IDs, `ticketId`, `repoUrl` and files (insights).
- Error bodies carry no provider detail.
- The tests are unweakened, and the full suite, `tsc` and the build pass.

The follow-ups, all Low, can land before or after merge at the human's decision:

- F1: the cache sweep.
- F2: the empty-state text.
- F3: align the live budget with the spec.
- F4: the missing `implementation-report.md` and token table. This should be resolved before T08 is marked complete.

## Re-check of F1–F4 (2026-11-09)

Reviewer: independent reviewer agent (did not implement this work). The human approved this re-check on 2026-11-09. This section is an assessment, not merge approval.
Execution log: `logs/tasks/ai-ta-assist/23-reviewer-recheck.md`.

### Versions and approvals checked

- Spec `workflow/specs/ai-ta-assist.md` v0.2: approval lines unchanged.
- Checklist `tasks.md` v0.3: approval line present ("Fix all now (Recommended)", recorded from the human).
- Handoff `handoff.md` v0.3: the version line and the v0.3 amendment record the same approval. The header's "Handoff approval evidence" line still mentions only v0.1/v0.2 (N2).

### Diff examined

`git diff ca009ea..5a1ecfe` (13 files, +308/−13) in a clean detached worktree at `5a1ecfe`: `5cf2173` (T10), `60c9074` (T11), `6b12767` (T12), `5a1ecfe` (report and log 22). Production changes are limited to `server/tickets/ta-ai-insights.js` (`set`) and `src/TAQueuePage.tsx` (`ticketCount` parsing and the empty text), both in the v0.3 allowed files. No dependency, CI or config change. No existing test file other than the live test was edited.

`ca009ea` ticks exactly T01, T02, T04, T05 and T06, which the first review found Met with no findings. T03 (F1), T07 (F2), T08 (F4) and T09 (F3) stay `[ ]`. Its wording-only edits to `spec.md` and the coverage header resolve I7. This matches the first verdict.

### Findings resolution

| Finding | Fix | Evidence | Status |
| --- | --- | --- | --- |
| F1 cache growth | `ta-ai-insights.js:100-106`: `set` deletes every entry with `t - at > ttlMs`, the same rule as `get`, before storing | `ta-ai-insights.cache-prune.test.js` (4 tests). Red check: against `ca009ea` production code, 2 of 4 fail ("removes entries older than the TTL", "prunes only the expired"); the other 2 guard against over-pruning | Resolved |
| F2 empty text | `TAQueuePage.tsx:63-64,198`: `ticketCount` is parsed (non-negative integer, otherwise `null`); the empty-queue text shows only for `ticketCount === 0`, otherwise "No common patterns found." The server already returns `ticketCount` on both the empty and the normal path (`ta-ai-insights-route.js:37,64`) and in cache hits | `TAQueuePage.ai-empty.test.tsx` (3 tests). Red check: against `ca009ea`, 2 of 3 fail (tickets with no groups; missing `ticketCount`) | Resolved |
| F3 live budget | `ta-ai-live-soclaas.integration.test.js:62-63,127-128`: a counting wrapper is passed as `fetch` to the real `createAiGateway`, which hands it to the transport, so every attempt (retries included) is counted. The budget asserts `fetchCalls <= 4` | Only the counter changed. No assertion was removed or relaxed: the endpoint-call counter (always 3) is replaced by a count that is ≥ 3. The wrapper logs and prints nothing; the URL, headers and body are only forwarded. Without the flag the suite skips (5 skipped) | Resolved offline; the stronger assertion has not run live |
| F4 report | `implementation-report.md` added | Token rows match logs 03, 05, 08, 13, 15, 17 and 22 row by row; the aggregate 994,403 is the exact sum of the 14 totals. The live-run table matches log 15 (run 1: 3 failed, ~50 ms, no `fetch`; runs 2–3: 503 after 1.1–2.1 s, backend outage; run 4: 4/4 passed). Suite counts match this re-check. Deviations (D1, two-line mounts, `c91ff81`, test changes) are accurate. No key, base URL (other than the dummy `fake.invalid`), prompt or response text | Resolved; see N1 |

### Verification (exact results in log 23)

| Command (from `src/codeclinic`) | Result |
| --- | --- |
| Full suite at `5a1ecfe` | Test Suites: 5 skipped, 58 passed, 58 of 63 total; Tests: 9 skipped, 1228 passed, 1237 total; exit 0 |
| `ta-ai-live` without the flag | Test Suites: 1 skipped, 0 of 1 total; Tests: 5 skipped, 5 total |
| New T10/T11 tests against `ca009ea` production code (temporary scratch worktree, removed) | Test Suites: 2 failed; Tests: 4 failed, 3 passed, 7 total |
| `npx tsc --noEmit -p .` | exit 0, no output |
| `npm run build` | exit 0, "Compiled successfully." |

The live mode was not run. `RUN_SOCLAAS_TESTS` was not set, no `.env` exists in the worktree, and no `.env` was read. No network was used.

### New findings

No Critical, High, Medium or Low findings.

| ID | Severity | Location | Evidence | Recommended action |
| --- | --- | --- | --- | --- |
| N1 | Info (evidence) | `implementation-report.md` Tasks table (T10–T12 rows); `logs/tasks/ai-ta-assist/22-orchestrator-group6.md` | The rows say "see the Group 6 log" for the commit, but log 22 does not list the commits. They are `5cf2173` (T10), `60c9074` (T11) and `6b12767` (T12) | Add the three hashes to the report |
| N2 | Info (evidence) | `handoff.md:7` | The "Handoff approval evidence" line still ends at v0.2; the v0.3 approval is recorded only in the version line and the amendments | Optional: add the v0.3 approval to that line |
| N3 | Info | `ta-ai-live-soclaas.integration.test.js:127` | With 3 endpoint calls, the run now fails if more than one retry happens. This is the intended v0.2 budget, but a flaky provider can now fail a live run that previously passed. The budget test also relies on running after the other three tests (noted by the implementer) | None; the human should expect this on the next live run |

### Per-task verification

| Task | Verified now? | Basis |
| --- | --- | --- |
| T03 | Yes | First review Met; F1 resolved by T10 |
| T07 | Yes | First review Met; F2 resolved by T11 |
| T08 | Yes | Guides verified in the first review; F4 resolved (report present and accurate; N1 is cosmetic) |
| T09 | Yes | Skip verified; human live run 4 passed; F3 resolved by T12 |
| T10 | Yes | Fix plus tests that fail without it |
| T11 | Yes | Fix plus tests that fail without it |
| T12 | Yes, to its stated criterion (offline skip) | Strengthening only; the new assertion is unexercised until the human's next live run |

Unverified, unchanged from the first review: 320 px layout in a browser, output usefulness, live behaviour of the stronger budget, and Firestore `Timestamp` cache keys in the emulator.

### Verdict

**Pass.** F1–F4 are resolved with tests that fail without the fixes, there are no regressions, T12 only strengthens the budget and prints nothing sensitive, and the implementation report is accurate. N1–N3 are Info only and do not block. The orchestrator may tick T03, T07, T08, T09, T10, T11 and T12; merge remains the human's decision.
