# Implementation T24 (improvement round 5, R4b-1 and R4b-2)

- Spec: ai-ta-assist v0.3 (R1). Checklist v0.7 Group 11, T24. Handoff v0.7. Base eb3b9e3.
- Changed: src/codeclinic/server/tickets/ta-ai-fix-note.js (two lines added to SYSTEM_PROMPT after the "For anything the ticket leaves unexplained" line; all existing lines verbatim); new src/codeclinic/test/ta-ai-prompts.round5.test.js (5 tests).
- New lines:
  1. "Name only files, tools, libraries, settings, and places that appear in the ticket; do not mention any other framework, tool, or setting."
  2. "Each thing you ask the TA to check must be something the ticket mentions, such as a file, a line, a setting, or the reported output, and never a guessed cause."
- Verification (from src/codeclinic): full suite Test Suites 5 skipped, 68 passed, 68 of 73 total; Tests 9 skipped, 1289 passed, 1298 total (was 1284/1293, +5). npx tsc --noEmit -p . clean. npm run build: Compiled successfully.
- No live run, no network, no .env read, no commit/stage/push. Live effect unverified.
- Risks: prompt-only, advisory output; the model may still add outside details or frame a guess as a check. Line 2 and the T22/T23 "restate and tell the TA to check it" line both point the TA at the reported output, so they are compatible.
