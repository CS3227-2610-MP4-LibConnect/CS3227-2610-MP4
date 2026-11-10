# ai-ta-assist: orchestrator verification of improvement round 3 (2026-11-10)

## Provenance of the round 3 work

- The orchestrator dispatched a round 3 implementer (Claude Sonnet), which **failed early on the usage limit** before finishing. The runtime reported it as failed and gave no usable token usage.
- The T20–T21 code, the test, `implementation-T20-T21.md`, log 29, log 30 (titled "orchestrator") and log 31 (titled "reviewer", model "Grok 4.7") were then written in the round 3 worktree by **another agent run by the human**, as the human confirmed on 2026-11-10 ("another agent. you can verify the work").
- That agent also edited the orchestrator's scratch harness (`e2e/live-e2e.js`) to add speculation metrics. It ran the live SoCLaaS harness 5 times (scratch files `r3-1`…`r3-5`, 00:11–00:12) using the `SOCLAAS_*` values from the human's main checkout `.env`. The orchestrator's round 3 brief had forbidden live runs. The human was told, and asked for verification instead of rework.
- Safety check by the orchestrator:
  - the modified harness talks only to `127.0.0.1` and, through the real server, to SoCLaaS;
  - it adds no file writes or outside network calls;
  - it prints no key, base URL or model value;
  - a scan of the 5 output files found no `SOCLAAS_`, `Bearer`, `api_key=` or `/v1` URL strings.
- Logs 29–31 and the "Improvement round 3 review" section of `review-report.md` are kept as that agent's record. They are not the orchestrator's own evidence.

## Verification by the orchestrator

- Code diff (against `5f64029`):
  - three fixed string lines in `server/tickets/ta-ai-insights.js` (T20) and three in `server/tickets/ta-ai-fix-note.js` (T21);
  - a new `test/ta-ai-prompts.round3.test.js` (6 tests);
  - no diff in `server/ai/*`, the routes, the UI, `buildUserContent`, the parsers or the caps.
  This matches checklist v0.5, Group 9.
- Log 30's metrics were recomputed by the orchestrator from the raw `final-*` and `r3-*` output files, and **all match**.
- Full suite in the round 3 worktree: Test Suites: 5 skipped, 65 passed, 65 of 70 total. Tests: 9 skipped, 1275 passed, 1284 total. `npx tsc --noEmit -p .` is clean, and `npm run build` compiled successfully.
- The orchestrator made 5 live runs of its own (`v3-1`…`v3-5`) on the round 3 code: the real `startServer()`, the emulator and the real SoCLaaS model, with the human's `SOCLAAS_*` values never printed. Each run passed 46/46, and port 8080 was free afterwards.

| Code, 5 runs each | Hedged drafts ("likely"/"probably") | Q3 grouped | All 6 grouped | Q2+Q3 together | Longest draft (characters) |
| --- | --- | --- | --- | --- | --- |
| PR code `5f64029` (final-*) | 3/20 | 3/5 | 3/5 | 3/5 | 485 |
| Round 3, the other agent's runs (r3-*) | 1/20 | 5/5 | 3/5 | 5/5 | 484 |
| Round 3, the orchestrator's runs (v3-*) | 0/20 | 5/5 | 5/5 | 4/5 | 441 |

## Conclusions

- T20 works: the instruction-like ticket was grouped in 10 of 10 round 3 runs, against 3 of 5 before.
- T21 removed the banned hedge words (1 of 40 drafts). However, the HTML-fixture drafts still infer causes through other wording ("indicating…", "suggests…") in 3 of 5 runs. Mentioning the display is allowed, because the ticket describes it, but the causal inference is residual speculation. This is advisory output that the TA reviews. A further improvement would be a positive instruction rather than more banned words.
- T20 and T21 are verified. They were ticked by the orchestrator on the strength of the other agent's independent review (log 31) and this verification.
- 2026-11-10: The human chose "Commit and push to PR #7 (Recommended)".
