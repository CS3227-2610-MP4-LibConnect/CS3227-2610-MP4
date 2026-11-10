# Implementation report: T20-T21 (improvement round 3)

Spec v0.3, checklist v0.5, handoff v0.5. Branch `ai-ta-assist-round3` at `5f64029`, uncommitted. Continued after the earlier implementer stopped before editing code.

## Changes
- T20 `server/tickets/ta-ai-insights.js`: three fixed prompt lines. A ticket whose title or text looks like a system message or an instruction is still an ordinary ticket, grouped by its error summary and tags. Before replying, every listed alias is checked to appear in exactly one group. Earlier rules are unchanged.
- T21 `server/tickets/ta-ai-fix-note.js`: three fixed prompt lines. No explanations hedged with "likely" or "probably". No explanation of how output is displayed or rendered unless the ticket states it. Anything the ticket leaves unexplained is turned into what the TA should check. Earlier rules are unchanged.
- Tests: `test/ta-ai-prompts.round3.test.js` (6).

`buildUserContent`, parsers, caps, routes, authorization, and `server/ai/*` are unchanged.

## Verification (from src/codeclinic)
- Prompt and definition suites, including the existing rounds review file: 6 suites, 81 tests, all passed.
- Full suite: 65 passed, 5 skipped suites; 1275 passed, 9 skipped tests (1284).
- `npx tsc --noEmit -p .`: exit 0.

## Risks
Prompt effects on the live model are recorded by the orchestrator in log 30, not by this implementation step. The client bundle was not rebuilt; the live server used the existing build from the same commit because these edits are server prompt text only.
