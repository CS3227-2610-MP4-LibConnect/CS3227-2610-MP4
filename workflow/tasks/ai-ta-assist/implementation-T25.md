# Implementation T25 (improvement round 5, final self-check)

- Spec: ai-ta-assist v0.3 (R1). Checklist v0.7 Group 11, T25. Base eb3b9e3, built on uncommitted T24.
- Changed: src/codeclinic/server/tickets/ta-ai-fix-note.js (one line added directly before the reply line; all other lines verbatim; reply line still last); new src/codeclinic/test/ta-ai-prompts.round5b.test.js (4 tests).
- New line: "Before replying, reread your note and delete any component, tool, or place the ticket does not mention (such as a server, browser console, framework, or security policy) and any check that names a cause the ticket does not state."
- Verification (from src/codeclinic): full suite Test Suites 5 skipped, 69 passed, 69 of 74 total; Tests 9 skipped, 1293 passed, 1302 total (was 1289/1298, +4). npx tsc --noEmit -p . exit 0. npm run build: Compiled successfully.
- No live run, no network, no .env read, no commit/stage/push. Live effect unverified.
- Risks: prompt-only, advisory output; a self-check instruction may not fully stop the model from adding outside details. The example list names a server/browser console, which could itself prime those words; needs the live measurement.
