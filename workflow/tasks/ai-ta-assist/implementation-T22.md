# Implementation T22 (improvement round 4)

- Spec: ai-ta-assist v0.3 (R1). Checklist v0.6 Group 10. Handoff v0.6. Base 95b73d9.
- Changed: src/codeclinic/server/tickets/ta-ai-fix-note.js (one added fixed line); new src/codeclinic/test/ta-ai-prompts.round4.test.js (5 tests).
- Added line (after the round 3 line "Do not explain how output is displayed or rendered unless the ticket states it."):
  "Describe only what the ticket reports. If the ticket says how output appears on screen (such as HTML or script text shown literally), restate that observation and tell the TA to check it, without naming a possible cause such as XSS, sanitization, escaping, or filtering."
- The round 3 line is unchanged because test/ta-ai-prompts.round3.test.js asserts it verbatim. The two lines do not conflict: the new one restates, the old one forbids explaining.
- Verification (from src/codeclinic): full suite Test Suites 5 skipped, 66 passed, 66 of 71 total; Tests 9 skipped, 1280 passed, 1289 total (was 1275/1284, +5). npx tsc --noEmit -p . clean. npm run build: Compiled successfully.
- No live run, no network, no .env read. Live effect is unverified; orchestrator runs live checks.
- Risks: model may still infer causes despite the instruction; prompt-only change, advisory output.
