# Implementation report: ai-ta-assist

Specification: `workflow/specs/ai-ta-assist.md` v0.2 (v0.1 and v0.2 human-approved 2026-11-09)
Checklist: `workflow/tasks/ai-ta-assist/tasks.md` v0.3 (v0.1–v0.3 human-approved 2026-11-09)
Handoff: `workflow/tasks/ai-ta-assist/handoff.md` v0.3 (human-approved 2026-11-09)
Integration branch: local `TA-coordinator`, from `9f34c4e`. Each task ran in its own worktree branch `ai-ta-assist-tNN` and was fast-forwarded in. Nothing was pushed.
Status: **implementation complete; awaiting re-review of T10–T12 and the human merge decision.** T01, T02, T04, T05 and T06 are `[x]` after the independent review. T03, T07, T08 and T09 stay `[ ]` until their follow-ups (T10–T12) and this report are re-reviewed.

## Tasks

| Task | Group | Commit | Task report | Orchestrator check |
| --- | --- | --- | --- | --- |
| Tests T01–T07 (test writer) | — | `eb49679` | `test-coverage-report.md` | 7 new suites red for the expected reasons; existing suites green |
| T01 shared helpers | 1 | `6ea07a4` | `implementation-T01.md` | 329/329 in the ticket and shared suites; R5 text matched to the spec |
| T02 fix-note definition | 2 | `a69f2e0` | `implementation-T02.md` | Code read; combined Group 2 suite green apart from Group 3 |
| T03 insights definition and cache | 2 | `f88ddf6`; follow-up T10 | `implementation-T03.md` | As T02 |
| T04 draft endpoint and registration | 3 | `064aada` | `implementation-T04.md` | Combined: 1212 passed; tsc and build OK |
| T05 insights endpoint | 3 | `d6ce524` | `implementation-T05.md` | `ta-routes.js` conflict resolved by the orchestrator |
| T06 draft button | 3 | `aabb65c` | `implementation-T06.md` | As T04 |
| T07 insights panel | 3 | `6dad099`; follow-up T11 | `implementation-T07.md` | Deviation D1 accepted |
| T09 opt-in live test | 4 | `7be00bc`; fix `c91ff81`; follow-up T12 | `implementation-T09.md` | Offline dry runs; human live run 4 passed 4/4 |
| T08 guides | 5 | `8946830` | `implementation-T08.md` | Placeholders only |
| T10 cache pruning (F1) | 6 | see the Group 6 log | `implementation-T10.md` | Red/green shown by the implementer |
| T11 empty-insights text (F2) | 6 | see the Group 6 log | `implementation-T11.md` | 52/52 in the UI suites |
| T12 real request count (F3) | 6 | see the Group 6 log | `implementation-T12.md` | Offline dry run: the counter equalled the fake fetch hits (3) |

Reconciliation logs: `logs/tasks/ai-ta-assist/03`, `05`, `08`, `13`, `15`, `17` and `22-orchestrator-*.md`.

## Deviations, findings, and test changes

- **D1 (accepted by the human):** T07 renamed the queue filter label "Concept" to "Concept tag", because the new kind badge also says "Concept".
- **Two-line mounts:** T04 and T05 each added a require plus a mount line in `ta-routes.js`, where the checklist said one line. The orchestrator resolved their adjacent-line conflict.
- **T09 fix (`c91ff81`):** CRA's Jest 27 has no `fetch`, so live run 1 got 503s without contacting SoCLaaS. A test-only Jest environment, `test/helpers/live-fetch-environment.js`, now passes the host's `fetch` into the test.
- **Review (`3cca103`): pass with follow-up**, with four Low findings:
  - F1: cache growth, fixed by T10;
  - F2: misleading empty text, fixed by T11;
  - F3: the budget counted endpoint calls, fixed by T12;
  - F4: this report was missing; it is this file.
  The review also added 9 review-only tests in `test/ta-ai-assist.review.test.js`.
- **Test changes after the test contract (`eb49679`):**
  - `c91ff81`: the live test docblock and a new helper;
  - T12: the live test budget now counts real `fetch` calls, and is strictly stronger;
  - new test files from T10 and T11 and from the review.
  The T01–T07 test files were not edited.

## Live verification (human-run)

| Run | Result | Cause |
| --- | --- | --- |
| 1 | 3 failed (503, about 50 ms) | No `fetch` in Jest 27; fixed in `c91ff81` |
| 2, 3 | 3 failed (503, 1–2 s) | Provider outage: "no healthy provider backends" for the configured model's backend group |
| 4 | **4/4 passed** | The human switched to a healthy model (recommended `qwen3.6:35b`) |

No prompt, response, key or URL was recorded. Token counts for live calls are unavailable, because the test does not print them by design. T12's stronger budget has not run live yet.

## Final verification (orchestrator, combined tree with T10–T12)

- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false`: Test Suites: 5 skipped, 58 passed, 58 of 63 total. Tests: 9 skipped, 1228 passed, 1237 total. The skipped suites are the 4 emulator suites and the live suite.
- `npx tsc --noEmit -p .`: clean. `npm run build`: compiled successfully.

## Unresolved risks

- The 320 px layout is checked only through CSS source tests, not in a browser.
- The insights cache is per server instance, so several instances each call the model.
- Model output quality is judged by the human only.
- Provider backend health varies by model. If `gemma4:26b` was the planned production `SOCLAAS_MODEL`, update the production secret (`environments-and-deployment`).
- Review notes I1, I3 and I6 (message wording) are not changed.

## Subagent token usage

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Test writer | T01–T07 tests, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 144,371 | Claude Code task notification `subagent_tokens` |
| Implementer | T01 (Group 1), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 56,263 | Claude Code task notification `subagent_tokens` |
| Implementer | T02 (Group 2), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 58,652 | Claude Code task notification `subagent_tokens` |
| Implementer | T03 (Group 2), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 53,510 | Claude Code task notification `subagent_tokens` |
| Implementer | T04 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 66,027 | Claude Code task notification `subagent_tokens` |
| Implementer | T05 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 62,755 | Claude Code task notification `subagent_tokens` |
| Implementer | T06 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 57,855 | Claude Code task notification `subagent_tokens` |
| Implementer | T07 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 57,799 | Claude Code task notification `subagent_tokens` |
| Implementer | T09 (Group 4), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 63,154 | Claude Code task notification `subagent_tokens` |
| Implementer | T08 (Group 5), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 68,927 | Claude Code task notification `subagent_tokens` |
| Reviewer | T01–T09 independent review, run 1 | claude-opus-5-5 | unavailable | unavailable | 170,157 | Claude Code task notification `subagent_tokens` |
| Implementer | T10 (Group 6), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 41,725 | Claude Code task notification `subagent_tokens` |
| Implementer | T11 (Group 6), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 46,631 | Claude Code task notification `subagent_tokens` |
| Implementer | T12 (Group 6), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 46,577 | Claude Code task notification `subagent_tokens` |

Every subagent reported its own counts as `unavailable`. The totals come from the runtime notifications. The task grouper was not run, because the grouping was approved inline.

Aggregate total so far (14 runs, all with reported totals): **994,403** tokens. Input and output splits are unavailable. The re-review run will be added when it finishes.
