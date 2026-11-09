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
