# ai-ta-assist: improvement rounds (2026-11-09)

The human asked for "2 rounds of improvement-testing-improvement-testing" and chose "Approve both rounds (Recommended)". Round 2 may proceed without another stop, within these limits: prompt wording, UI or error text, internal tidy-ups and tests. There may be no change to authorization, the data sent to the model, the parsers or the gateway.

Live checks use the orchestrator's scratch harness `e2e/live-e2e.js`: the real `startServer()` on the emulator, real SoCLaaS, and the human's `SOCLAAS_*` values, never printed. It runs 46 pass/fail checks plus informational quality metrics. AI text was shown to the human in the session only and is not recorded here.

## Baseline (code at `7879ad8`)

| Run | Checks | Past-tense drafts | Insights coverage | Q3 grouped | Q2+Q3 together | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| B1 (pre-PR run, log 24) | 46/46 | 1/4 | 4/6 | no | no | The HTML draft asserted an unsupported cause |
| B2 | 46/46 | 0/4 | 5/6 | no | no | The HTML draft asserted an unsupported cause; one summary gave incorrect code advice about the loop bound |

## Round 1 (T13–T16)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T13–T16 (Group 7), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 66,239 | Claude Code task notification `subagent_tokens` (13 tool uses, 122.4 s) |

- Scope check: the diff touches only the allowed files. `server/ai/*` has 0 lines of diff, and `buildUserContent`, the parsers and the caps are unchanged. The only existing-test edits are the two allowed insights expectation strings.
- Full suite: Test Suites: 5 skipped, 60 passed, 60 of 65 total. Tests: 9 skipped, 1243 passed, 1252 total. `tsc` is clean and the build compiled.

| Run | Checks | Past-tense drafts | Insights coverage | Q3 grouped | Q2+Q3 together | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R1-1 | 46/46 | 0/4 | 6/6 | yes | yes | The HTML draft hedges ("the TA should check…") but is long (about 700 characters) |
| R1-2 | 46/46 | 0/4 | 4/6 | no | no | The HTML draft hedges; the secret ticket and Q3 were left ungrouped |

Conclusion: 1a (no guessing, present tense) worked in both runs. 1b improved coverage, but it varies between runs. There was no incorrect code advice. New issue: one draft was verbose.

## Round 2 plan (within the approved limits)

- T17: the insights prompt places every listed ticket in exactly one group, and summaries name the concept to re-teach without prescribing code.
- T18: the drafter prompt keeps the note to at most four short sentences.
- T19: the insights panel shows "Grouped X of Y active tickets." when some active tickets are not grouped.

## Round 2 (T17–T19)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T17–T19 (Group 8), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 51,624 | Claude Code task notification `subagent_tokens` (9 tool uses, 76.6 s) |

- Scope check:
  - `server/ai/*` and the routes are unchanged beyond round 1's T16 line;
  - no existing tests were edited in round 2;
  - `ticketCount` is `tickets.length` (at most 60, `ta-ai-insights-route.js:64`), so the coverage note agrees with the 60-ticket note.
- Full suite: Test Suites: 5 skipped, 62 passed, 62 of 67 total. Tests: 9 skipped, 1254 passed, 1263 total. `tsc` is clean and the build compiled.

| Run | Checks | Past-tense drafts | Draft lengths (characters) | Max sentences | Insights coverage | Q3 grouped | Q2+Q3 together |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | 46/46 | 0/4 | 312, 221, 485, 361 | 4 | 6/6 (4 groups) | yes, but in a separate catch-all group | no |
| R2-2 | 46/46 | 0/4 | 304, 316, 309, 471 | 4 | 6/6 (3 groups) | yes | yes |

For comparison, round 1's draft lengths were 346, 287, 547, 750 and 328, 248, 489, 539, and its coverage was 6/6 and 4/6.

Conclusions:
- T17 gave full coverage in both runs, and summaries name concepts without code advice.
- T18 brought the longest draft down from 750 to 485 characters, at most 4 sentences.
- Residual model-quality notes, which are advisory and not defects:
  - R2-1 put the alias-injection ticket in a separate catch-all group instead of the recursion group;
  - R2-1's injection-ticket draft explained the loop range inaccurately. … should be len(xs)").
  TAs review every draft, as the UI states.

_Note (2026-11-09): the model-output fragments were paraphrased after the rounds review (R1), so this log quotes no model output._

## Rounds review and follow-up (2026-11-09)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Reviewer | T13–T19 rounds review, run 3 | claude-opus-5-5 | unavailable | unavailable | 100,030 | Claude Code task notification `subagent_tokens` (24 tool uses, 290.2 s) |

- Verdict: pass with follow-up. T13–T19 are all verified and within the approved limits, with no Critical, High or Medium findings.
- The review covered an uncommitted patch applied to a detached `7879ad8` checkout (`<scratchpad>/rounds.patch`); the reviewer recorded the exception.
- The reviewer's suite with its 15 review-only tests: Test Suites: 5 skipped, 64 passed. Tests: 9 skipped, 1269 passed, 1278 total. `tsc` and the build are clean. The orchestrator re-ran the suite on the rounds worktree with the review tests copied in and got the same counts.
- Follow-ups:
  - R1: model fragments in logs 24 and 26 are now paraphrased, with a note in each;
  - R2: a correction was appended to `implementation-T17-T19.md`;
  - R3: the approval quotes now match and v0.4 is in the evidence lines;
  - R4 (stale header comments) and R5 (catch-all grouping) were left as optional or no-action notes.
- **Orchestrator editing error, recovered:**
  - While applying R3, an inline helper opened `tasks.md` and `handoff.md` for writing before reading them, which truncated both files to a single amendment line.
  - Both were restored from the review checkout `a-rrev`, which held their exact pre-step content and which the reviewer had not modified.
  - The restore was confirmed by their diffs against `7879ad8` (the same as before the step: tasks.md +50 lines, handoff.md +7/−3), and the edits were then reapplied with a read-then-write helper.
  - No committed content was affected.
- T13–T19 were ticked, so all of T01–T19 are now `[x]`.
- 2026-11-09: The human chose "Commit all 5 (Recommended)".
