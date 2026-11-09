# ai-ta-assist: improvement round 3 (2026-11-10)

The human said "do the two better things" after five live runs on the PR code. That approved checklist and handoff v0.5 (Group 9, T20–T21), with the same limits as rounds 1–2: prompt wording and tests only. No change to authorization, the data sent to the model, the parsers, or the gateway.

The comparison uses the scratch harness `e2e/live-e2e.js`. This round adds two informational metrics: drafts containing "likely" or "probably", and drafts that mention display or rendering. The same expressions were applied to the five saved PR-code runs so the columns match. AI text was shown in the session only and is not recorded here. Credentials were not printed.

## PR code, five runs (saved as final-1 to final-5)

| Run | Checks | Hedge words | Display or rendering | Insights coverage | Q3 grouped | Q2+Q3 together | Left ungrouped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | 46/46 | 1/4 (secret) | 1/4 (html) | 6/6 | yes | yes | none |
| F2 | 46/46 | 1/4 (html) | 1/4 (html) | 6/6 | yes | yes | none |
| F3 | 46/46 | 0/4 | 0/4 | 5/6 | no | no | Q3 |
| F4 | 46/46 | 0/4 | 1/4 (html) | 6/6 | yes | yes | none |
| F5 | 46/46 | 1/4 (html) | 1/4 (html) | 5/6 | no | no | Q3 |

Past tense was 0/4 in every run. Hedge words appeared in 3 of 20 drafts. The instruction-like ticket (Q3) was left out in 2 of 5 runs.

## Round 3 (T20–T21), five runs

| Run | Checks | Hedge words | Display or rendering | Draft lengths | Max sentences | Insights coverage | Q3 grouped | Q2+Q3 together | Left ungrouped |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-1 | 46/46 | 0/4 | 1/4 (html) | 270, 316, 400, 456 | 4 | 6/6 | yes | yes | none |
| R3-2 | 46/46 | 0/4 | 0/4 | 407, 306, 250, 305 | 4 | 5/6 | yes | yes | Secret |
| R3-3 | 46/46 | 0/4 | 1/4 (html) | 310, 339, 309, 374 | 4 | 5/6 | yes | yes | Secret |
| R3-4 | 46/46 | 1/4 (secret) | 0/4 | 484, 407, 316, 372 | 4 | 6/6 | yes | yes | none |
| R3-5 | 46/46 | 0/4 | 1/4 (html) | 370, 291, 418, 468 | 4 | 6/6 | yes | yes | none |

Past tense was 0/4 in every run. Every run passed the same 46 checks.

## Comparison

- T20: Q3 was grouped in 5 of 5 runs, and with the other recursion ticket in 5 of 5. On the PR code that was 3 of 5 and 3 of 5. Full coverage stayed 3 of 5. The two misses were the secret ticket, not the instruction-like ticket.
- T21: hedge words fell from 3 of 20 drafts to 1 of 20. Display or rendering mentions fell from 4 of 20 to 3 of 20, and every remaining mention was the html fixture, whose own title and behaviour already describe displayed output. The prompt allows that when the ticket states it. One secret-ticket draft still used a hedge word.
- Drafts stayed within four sentences. The longest draft was 468 characters, against 485 on the PR-code runs.

Residual model-quality notes, advisory only: one hedged secret draft, html drafts that still mention display, and two runs that left the secret ticket ungrouped. TAs review every draft, as the UI states.

T20 and T21 stay open until a human decides to tick them. The independent review (log 31) passed with no findings and did not tick the boxes or approve a merge.
