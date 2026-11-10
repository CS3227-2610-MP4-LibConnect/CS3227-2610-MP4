# Implementation T23 (improvement round 4 follow-up, R4-1)

- Spec: ai-ta-assist v0.3 (R1). Checklist v0.6 Group 10, T23. Handoff v0.6. Base 95b73d9, built on uncommitted T22.
- Pre-check: test/ta-ai-prompts.round4.test.js uses an unanchored regex for the old ending; the new wording still matches. That test was not edited.
- Changed: src/codeclinic/server/tickets/ta-ai-fix-note.js line 23 (ending only); new src/codeclinic/test/ta-ai-prompts.round4b.test.js (4 tests).
- New line: "Describe only what the ticket reports. If the ticket says how output appears on screen (such as HTML or script text shown literally), restate that observation and tell the TA to check it, without naming a possible cause such as XSS, sanitization, escaping, or filtering, unless the ticket itself states that cause."
- Verification (from src/codeclinic): full suite Test Suites 5 skipped, 67 passed, 67 of 72 total; Tests 9 skipped, 1284 passed, 1293 total (was 1280/1289, +4). npx tsc --noEmit -p . clean. npm run build: Compiled successfully.
- No live run, no network, no .env read, no commit/stage/push. Live effect unverified.
- Risks: prompt-only, advisory output; the model may still over- or under-apply the exception.
