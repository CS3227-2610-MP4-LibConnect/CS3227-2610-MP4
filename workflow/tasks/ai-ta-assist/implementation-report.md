# Implementation report: ai-ta-assist

Specification: `workflow/specs/ai-ta-assist.md` v0.2 (v0.1 and v0.2 human-approved 2026-11-09)
Checklist: `workflow/tasks/ai-ta-assist/tasks.md` v0.3 (v0.1–v0.3 human-approved 2026-11-09)
Handoff: `workflow/tasks/ai-ta-assist/handoff.md` v0.3 (human-approved 2026-11-09)
Integration branch: local `TA-coordinator`, from `9f34c4e`. Each task ran in its own worktree branch `ai-ta-assist-tNN` and was fast-forwarded in. Nothing was pushed.
Status: **T01–T12 complete and accepted** (the human chose "Accept and commit evidence (Recommended)" on 2026-11-09). **Improvement rounds 1–2 (T13–T19) are implemented and reviewed, with the verdict "pass with follow-up" (evidence-only findings fixed), awaiting the human's commit and merge decision.** Nothing was pushed or merged to `main`. The independent review passed with follow-up, and the re-check of F1–F4 passed. All of T01–T12 are `[x]`.

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
| T10 cache pruning (F1) | 6 | `5cf2173` | `implementation-T10.md` | Red/green shown by the implementer |
| T11 empty-insights text (F2) | 6 | `60c9074` | `implementation-T11.md` | 52/52 in the UI suites |
| T12 real request count (F3) | 6 | `6b12767` | `implementation-T12.md` | Offline dry run: the counter equalled the fake fetch hits (3) |

Reconciliation logs: `logs/tasks/ai-ta-assist/03`, `05`, `08`, `13`, `15`, `17` and `22-orchestrator-*.md`. Review logs: `18-reviewer.md` and `23-reviewer-recheck.md`.

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
- **Re-check (pass):** F1–F4 are resolved, and each code fix has tests that fail without it. Info notes:
  - N1: commit hashes added here;
  - N2: the handoff approval line is updated;
  - N3: a live run now fails if the provider needs more than one retry, which is the intended budget.
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
| 5 | **4/4 passed** | Run by the orchestrator at the human's explicit request, a one-time deviation from the handoff. It is the first live run of T12's real-fetch budget |

No prompt, response, key or URL was recorded. Token counts for live calls are unavailable, because the test does not print them by design. T12's stronger budget passed live in run 5.

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
| Reviewer | F1–F4 re-check, run 2 | claude-opus-5-5 | unavailable | unavailable | 85,365 | Claude Code task notification `subagent_tokens` |
| Implementer | T13–T16 (Group 7, round 1), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 66,239 | Claude Code task notification `subagent_tokens` |
| Implementer | T17–T19 (Group 8, round 2), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 51,624 | Claude Code task notification `subagent_tokens` |
| Reviewer | T13–T19 rounds review, run 3 | claude-opus-5-5 | unavailable | unavailable | 100,030 | Claude Code task notification `subagent_tokens` |

Every subagent reported its own counts as `unavailable`. The totals come from the runtime notifications. The task grouper was not run, because the grouping was approved inline.

Aggregate total (18 runs, all with reported totals): **1,297,661** tokens. Input and output splits are unavailable.

## Improvement rounds 1–2 (T13–T19)

- Round 1: T13 (drafter: present tense, no guessing), T14 (insights coverage), T15 (insights invalid-output text, spec v0.3 R5) and T16 (shared message constants).
- Round 2: T17 (every ticket in one group; concept-only summaries), T18 (at most four sentences) and T19 ("Grouped X of Y active tickets.").
- Live measurements, two runs per stage, are in log 26. Each run passed 46/46 checks. Insights coverage went from 4/6 and 5/6 at baseline to 6/6 and 6/6 after round 2. Unsupported-cause drafts went from 2/2 to 0/2. The longest draft went from 750 characters (round 1) to 485 (round 2).
- Final suite on the rounds tree with the review tests: Test Suites: 5 skipped, 64 passed. Tests: 9 skipped, 1269 passed. `tsc` and the build are clean.
- Rounds review: pass with follow-up. R1–R3 were evidence-only and are fixed. R4 (stale "v0.2" in code header comments) and R5 (catch-all grouping) were left as optional or no-action notes.

## Improvement round 3 (T20–T21)

- T20: a ticket that looks like an instruction is still grouped, with a self-check that every alias appears once. T21: no hedged speculation; tell the TA what to check.
- The work came from another agent run by the human (logs 29–31, including its own live runs and review). The orchestrator's dispatched implementer had failed on the usage limit. The orchestrator verified the work independently (log 32).
- Results: 1275 tests passed, and `tsc` and the build are clean. Across 10 live round 3 runs, all passed 46/46 checks. The injected ticket was grouped in 10/10 runs, against 3/5 before. Hedged drafts were 1/40, against 3/20 before. Inferred-cause wording remains in some HTML-fixture drafts (an advisory quality note).
- Token usage: the orchestrator's round 3 implementer failed early, and the runtime reported no usable usage, so its row is `unavailable`. The other agent's runs are outside this runtime and are not counted. No further subagents ran.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T20–T21 (Group 9), run 1 (failed on the usage limit) | claude-sonnet-5-5 | unavailable | unavailable | unavailable | The runtime notification reported a failure with no usage |

Because this run's total is unavailable, an aggregate covering all 19 runs is unavailable. The 18 earlier runs total 1,297,661 tokens.

## Improvement round 4 (T22–T23)

- T22: a positive drafter instruction to restate what the ticket reports about displayed output and tell the TA to check it, without naming a cause. T23 (review R4-1): the exception "unless the ticket itself states that cause".
- Live results (logs 34 and 37):
  - The HTML-fixture draft inferred a display cause in 0/10 round 4 runs, against 12/15 before.
  - A new stated-cause fixture kept its stated cause in 5/5 runs.
  - The final 5 runs each passed 51/51 checks, with 7/7 insights coverage.
- Final suite: 1284 passed and 9 skipped. `tsc` and the build are clean. The reviews passed with follow-up (log 35, R4-1 fixed by T23), then passed (log 38). The remaining Info notes R4b-1 and R4b-2 are advisory-quality items with no action needed.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T22 (Group 10), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 44,114 | Claude Code task notification `subagent_tokens` |
| Reviewer | T22 round 4 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 59,916 | Claude Code task notification `subagent_tokens` |
| Implementer | T23 (Group 10), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 43,469 | Claude Code task notification `subagent_tokens` |
| Reviewer | T23 re-check, run 2 | claude-opus-5-5 | unavailable | unavailable | 56,674 | Claude Code task notification `subagent_tokens` |

The aggregate stays unavailable because the round 3 implementer run has no total.

## Improvement round 5 (T24–T25)

- T24: drafts name only files, tools, libraries, settings and places that appear in the ticket, and every check points at something the ticket mentions. T25: a final self-check that deletes anything the ticket does not mention. The human explicitly confirmed T25 (review R5-1).
- Live results (log 40):
  - drafts with an outside detail fell from 4/25 to 2/25 after T24, and to **0/25** after T25;
  - every run passed 51/51;
  - the stated cause was kept in 5/5 runs, and insights coverage was 7/7 in 5/5.
- Review (log 42): pass with follow-up. R5-1 is resolved. R5-2 (a valid fix could be suppressed if it names something outside the ticket), R5-3 (one "rendered or escaped" check and one hedge) and R5-4 (the prompt grew 44% to 1,724 characters, so consolidate lines rather than keep appending) are Info notes with no action now.
- Final suite: 1293 passed and 9 skipped. `tsc` and the build are clean.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T24 (Group 11), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 46,688 | Claude Code task notification `subagent_tokens` |
| Implementer | T25 (Group 11), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 43,208 | Claude Code task notification `subagent_tokens` |
| Reviewer | T24–T25 round 5 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 69,342 | Claude Code task notification `subagent_tokens` |

## Improvement round 6 (T26)

- T26: the drafter must always state a concrete fix. The name limits and the final self-check apply to the problem, the cause and the checks, not to the fix, which may name a standard language feature or common library function. Spec R1 was clarified to match in v0.4, as the human approved (review R6-2).
- Live results (log 44), in 5 runs each with all 56/56 checks passing. The fix counts are by the orchestrator's reading by hand; the keyword metric is a rough proxy (see log 44's correction).
  - The normal draft stated a fix in 2/5 runs before and **5/5** after.
  - A new datefix fixture, whose fix needs a library the ticket never names, went from 0/5 to **5/5**.
  - Trade-off: 1/25 drafts named an outside component inside a check ("framework"), against 0/25 before. The reviewer judged it a lapse within noise.
- Review (log 45): pass with follow-up.
  - R6-2 was resolved by spec v0.4.
  - R6-3 (the implementer skipped its preflight) and R6-4 (the metric rescore) were corrected in the evidence.
  - R6-1 (optional tighter wording) and R6-5 (the prompt is now 1,992 characters; consolidate in any later round) are Info.
- Final suite: 1297 passed and 9 skipped. `tsc` and the build are clean.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T26 (Group 12), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 41,416 | Claude Code task notification `subagent_tokens` |
| Reviewer | T26 round 6 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 67,278 | Claude Code task notification `subagent_tokens` |
