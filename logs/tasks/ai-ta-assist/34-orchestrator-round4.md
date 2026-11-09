# ai-ta-assist: improvement round 4 (2026-11-10)

The human asked to "continue improve" the item left partly open after round 3: drafts that infer a cause for HTML or script text shown on the page. Checklist and handoff v0.6 (Group 10, T22) were approved within the same limits as rounds 1–3.

## Implementer

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T22 (Group 10), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 44,114 | Claude Code task notification `subagent_tokens` (4 tool uses, 61.8 s) |

- Diff: one added fixed line in `server/tickets/ta-ai-fix-note.js`, after the round 3 "Do not explain…" line, which was kept because a committed test asserts it verbatim. There is also a new `test/ta-ai-prompts.round4.test.js` (5 tests). There is no diff in `server/ai/*`, the routes, the UI, `buildUserContent`, the parsers or the caps.
- The implementer read no `.env`, made no live run, and wrote only its own evidence (`implementation-T22.md`, log 33).

## Verification by the orchestrator

- Full suite: Test Suites: 5 skipped, 66 passed, 66 of 71 total. Tests: 9 skipped, 1280 passed, 1289 total. `npx tsc --noEmit -p .` is clean, and `npm run build` compiled successfully.
- The harness gained one informational metric, `html draft infers a display cause`, matching `indicat*|suggest*|XSS|cross-site|sanitiz*|escap*|vulnerab*|filter*` in the HTML-fixture draft. The previous harness version is kept as `e2e/live-e2e.before-r4.js`.
- Baseline, computed with the same pattern on the saved outputs:
  - PR code (`final-*`): 4/5;
  - round 3 (`r3-*`): 3/5;
  - round 3 (`v3-*`): 5/5;
  - **12/15 overall**.
- Round 4 live runs (`v4-1`…`v4-5`): the real `startServer()`, the emulator and the real SoCLaaS model, with the human's `SOCLAAS_*` values never printed. Each run passed **46/46**.

| Measure | Round 3 (v3, 5 runs) | Round 4 (v4, 5 runs) |
| --- | --- | --- |
| HTML draft infers a display cause | 5/5 | **0/5** |
| Drafts hedged with "likely"/"probably" | 0/20 | 2/20 (both qualify a supported cause, not the display) |
| All 6 tickets grouped | 5/5 | 3/5 |
| Alias-injection ticket (Q3) grouped | 5/5 | 4/5 |

## Conclusions

- T22 works. All five HTML drafts restate the reported display and tell the TA to check it, with no guessed cause.
- The insights prompt did not change in round 4, so the coverage difference is run-to-run variation in the model. Across all 15 round 3 and round 4 runs, Q3 was grouped in 14.
- "Likely" reappeared in 2 of 20 drafts, qualifying a cause the ticket supports. This is a residual advisory-quality note.
