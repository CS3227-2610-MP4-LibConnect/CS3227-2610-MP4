# ai-ta-assist: T23 (review R4-1) (2026-11-10)

The round 4 review (log 35) found R4-1 (Low): the T22 line forbade naming a display cause with no exception for a cause the ticket itself states. The human chose "Fix R4-1, then commit (Recommended)".

## Implementer

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Reviewer | T22 round 4 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 59,916 | Claude Code task notification `subagent_tokens` (9 tool uses, 138.9 s) |
| Implementer | T23 (Group 10), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 43,469 | Claude Code task notification `subagent_tokens` (5 tool uses, 56.8 s) |

- Diff: the T22 line's ending gains ", unless the ticket itself states that cause". There is also a new `test/ta-ai-prompts.round4b.test.js` (4 tests). The existing round 4 test uses an unanchored regex, so it still passes, unedited.
- Full suite: Test Suites: 5 skipped, 67 passed, 67 of 72 total. Tests: 9 skipped, 1284 passed, 1293 total. `tsc` is clean and the build compiled.

## Live verification (orchestrator)

- The harness gained an 8th synthetic ticket ("Stated"): its actual behaviour says the HTML shows as text *because* a Jinja template has autoescape on. The previous harness version is kept as `e2e/live-e2e.before-t23.js`.
- New checks: 6 provider calls and 6 `aiUsage` records, giving 51 checks in total. New quality metric: the stated-cause draft keeps the stated cause (matches `autoescap|escap`).
- Runs `v4b-1`…`v4b-5`: each passed **51/51**.
  - The HTML draft inferred a display cause in 0/5 runs.
  - The stated-cause draft kept the stated cause in **5/5**.
  - Hedged drafts: 0/25.
  - Insights coverage was 7/7 in 5/5 runs, and the alias-injection ticket was grouped in 5/5.
- Residual quality notes, which the keyword metric does not catch and which are advisory:
  - one HTML draft named a possible cause as something to check (a content-security policy);
  - one added a detail not in the ticket (the browser console).

## Re-check and close (2026-11-10)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Reviewer | T23 re-check, run 2 | claude-opus-5-5 | unavailable | unavailable | 56,674 | Claude Code task notification `subagent_tokens` (7 tool uses, 132.3 s) |

- The re-check (log 38) passed: R4-1 is closed. R4b-1 and R4b-2 are Info with no action needed.
- The orchestrator ticked T22 and T23, so all of T01–T23 are `[x]`.
- The human had already approved the commit and push ("Fix R4-1, then commit (Recommended)").
