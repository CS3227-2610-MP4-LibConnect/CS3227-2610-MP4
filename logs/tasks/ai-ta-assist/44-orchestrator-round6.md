# ai-ta-assist: improvement round 6 (2026-11-10)

The human asked to fix round 5 note R5-2: the "name only what's in the ticket" rule could stop a draft from suggesting a library that would be the right fix. Checklist and handoff v0.8 (Group 12, T26) were approved within the same limits.

## Measurement first

- A new 9th synthetic fixture, "Datefix": date strings are sorted lexicographically. The correct fix needs something the ticket never names (`datetime` parsing or zero-padding). TA B claims and drafts it, because TA A is at the 5/min per-user limit. This adds 1 provider call, so there are 7 calls and 56 checks. The previous harness version is kept as `e2e/live-e2e.before-r6.js`.
- New metrics: "draft states a fix (not as a check)" for the normal and datefix drafts. A fix sentence must match a fix pattern and must not contain check/verify/confirm/ensure. The datefix pattern was widened after round 6 (see below).
- Baseline on the PR code `d2b3418` (runs `b6-1`…`b6-5`): each passed 56/56. The datefix draft stated a fix in **0/5** runs: two mentioned `datetime` only inside a "TA should check" sentence, and three gave no fix.
- The same fix metric, recomputed on the saved outputs for the normal ticket: rounds 1–2 4/4; PR code 3/5; round 3 4/5; round 4 2/5; round 5 1/5; PR code `d2b3418` 2/5. The anti-speculation and name-limit rules had crowded out the fix that R1 requires.

## T26

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T26 (Group 12), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 41,416 | Claude Code task notification `subagent_tokens` (4 tool uses, 52.6 s) |

- **Process deviation:** the implementer reported that it did not read the spec, `tasks.md`, `handoff.md` or R5-2 (its preflight) and worked from the brief alone. The one-line change matches the T26 checklist text. The reviewer was asked to check it against the spec.
- Diff: one fixed line directly before the T25 self-check. It requires a concrete fix and limits the name rules and the self-check to the problem, the cause and the checks, so the fix may name a standard feature or library. There is also a new `test/ta-ai-prompts.round6.test.js` (4 tests).
- Full suite: Test Suites: 5 skipped, 70 passed, 70 of 75 total. Tests: 9 skipped, 1297 passed, 1306 total. `tsc` is clean and the build compiled.
- Live runs `v6-1`…`v6-5`: each passed **56/56**.

| Measure | Before (b6) | After T26 (v6) |
| --- | --- | --- |
| Normal draft states a fix | 2/5 | **5/5** |
| Datefix draft states a fix | 0/5 | **5/5**, by orchestrator reading; the original narrow pattern said 2/5, and the widened pattern matches all 5 |
| Drafts with an outside detail | 0/25 | 1/25 (html: "framework") |
| HTML draft infers a display cause | n/a | 1/5 (the same draft: "check if the framework is auto-escaping"); a second keyword hit was a restatement ("indicates the page renders the output as text") |
| Hedged drafts | n/a | 2/25 (both secret) |
| Insights coverage, all 8 | n/a | 4/5 |

## Conclusions

- T26 restores the fix in both measured tickets, including one that needs a library the ticket never mentions.
- Trade-off: one HTML draft named an outside component inside a check (1/25). This is milder than round 4 (4/25), but up from round 5's 0/25.

## Correction (2026-11-10, after the round 6 review, R6-4)

- The T26 table row says the widened datefix pattern "matches all 5". **That is wrong.** Rescoring the saved outputs with the widened pattern gives:
  - baseline (`b6-*`) 1/5;
  - round 6 (`v6-*`) 4/5.
- Both differences are pattern errors, not draft changes:
  - **b6 false positive:** a *cause* sentence contains "inconsistent zero-padding".
  - **v6 false negative (`v6-5`):** the fix sentence ("…convert the date strings into a format where day and month are zero-padded or use a proper date parsing library to ensure correct ordering") contains "ensure", which the metric treats as a check word.
- The orchestrator's reading of the drafts by hand is unchanged: baseline 0/5, round 6 5/5.
- The keyword metric is a rough proxy, and the hand reading is the measure the conclusions rest on.

## Round 6 review (log 45)

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Reviewer | T26 round 6 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 67,278 | Claude Code task notification `subagent_tokens` (9 tool uses, 170.6 s) |

- Verdict: pass with follow-up.
  - R6-1 (Info): optional tighter wording.
  - R6-2 (Low): line 27 versus R1 and line 17's "no new information beyond the ticket"; needs human confirmation.
  - R6-3 (Low): log 43 and `implementation-T26.md` didn't record the skipped preflight; corrected below.
  - R6-4 (Info): the baseline rescore; corrected above.
  - R6-5 (Info): the prompt grew to 1,992 characters.
- 2026-11-10: The human chose "Clarify spec, commit + push (Recommended)". Spec v0.4 was applied, T26 was ticked, and the work was committed and pushed.
