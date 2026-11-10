# ai-ta-assist: improvement round 5 (2026-11-10)

The human said "improve the prompt to fix" the two advisory notes left after round 4: R4b-1 (a guessed cause framed as a check) and R4b-2 (a detail not in the ticket). Checklist and handoff v0.7 (Group 11) were approved within the same limits.

## Measurement

- New informational harness metric, "drafts with an outside detail": a draft names a term from `e2e/outside-terms.json` (tools, frameworks, places and causes such as console, Flask, server, CSP and XSS) that does not appear in that ticket's own Firestore document. The previous harness version is kept as `e2e/live-e2e.before-r5.js`.
- Baseline, recomputed from the saved outputs: round 4 `v4b-*` had **4/25** drafts (html: console ×2; html: content security policy; stated: flask). `v4-*` had 1/20.

## T24

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T24 (Group 11), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 46,688 | Claude Code task notification `subagent_tokens` (6 tool uses, 69.7 s) |

- Diff: two fixed lines in `ta-ai-fix-note.js` (only names that appear in the ticket; checks must point at something the ticket mentions), plus a new `test/ta-ai-prompts.round5.test.js` (5 tests). There are no other changes.
- Full suite: Test Suites: 5 skipped, 68 passed, 68 of 73 total. Tests: 9 skipped, 1289 passed, 1298 total. `tsc` is clean and the build compiled.
- Live runs `v5-1`…`v5-5`: each passed **51/51**.
  - Outside detail: **2/25**, both "server" in the HTML draft.
  - HTML draft infers a display cause: 1/5 (the word "escaped", in a check sentence).
  - Stated cause kept: 5/5. Hedges: 0/25. Insights coverage 7/7: 5/5.
- Conclusion: "Flask", "console" and the CSP check are gone. The HTML draft still assigns the display to a component the ticket does not mention ("server") in 2/5 runs. The issue is improved but not fixed, so a follow-up (T25) is planned: a final self-check line.

## T25

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T25 (Group 11), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 43,208 | Claude Code task notification `subagent_tokens` (5 tool uses, 49.2 s) |

- Diff: one fixed self-check line directly before the reply line (reread the note and delete any component, tool or place the ticket does not mention, and any check that names an unstated cause), plus a new `test/ta-ai-prompts.round5b.test.js` (4 tests).
- Full suite: Test Suites: 5 skipped, 69 passed, 69 of 74 total. Tests: 9 skipped, 1293 passed, 1302 total. `tsc` is clean and the build compiled.
- Live runs `v5b-1`…`v5b-5`: each passed **51/51**.

| Measure | Round 4 (v4b) | T24 (v5) | T24+T25 (v5b) |
| --- | --- | --- | --- |
| Drafts with an outside detail | 4/25 | 2/25 | **0/25** |
| HTML draft infers a display cause (keyword) | 0/5 | 1/5 | 1/5 ("rendered or escaped", phrased as a check) |
| Stated cause kept | 5/5 | 5/5 | 5/5 |
| Hedged drafts | 0/25 | 0/25 | 1/25 (a secret-ticket draft) |
| Insights coverage 7/7 | 5/5 | 5/5 | 5/5 |

- Conclusion: T25 removed the remaining outside details ("server"). The two residual items are a check that mentions escaping without asserting a cause, and one hedge word. Both are advisory quality notes.

## Review and close (2026-11-10)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Reviewer | T24–T25 round 5 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 69,342 | Claude Code task notification `subagent_tokens` (12 tool uses, 163.7 s) |

- The review (log 42) passed with follow-up. R5-1 (T25 lacked an explicit approval record) was resolved when the human chose "Confirm T25, commit + push (Recommended)". R5-2 to R5-4 are Info.
- The orchestrator ticked T24 and T25, so all of T01–T25 are `[x]`.
