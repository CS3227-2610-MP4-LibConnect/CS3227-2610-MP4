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

