# T02 execution log

Working directory for commands: `src/codeclinic`.

1. `npm test -- --runInBand --watchAll=false --silent StudentTickets.test.tsx -t "direct entry|visitor is returned|required fields|language is a fixed-choice|valid submission|stays on the form"` — exit 0; 1 suite passed; 8 tests passed, 2 skipped (T03 entry-point cases).
2. `npm test -- --runInBand --watchAll=false --silent server.test.js` — exit 0; 2 suites passed; 10 tests passed. This includes direct and refresh requests to `/student/tickets/new` returning the frontend shell.
3. `npm run build` — exit 0; optimized production build compiled successfully without warnings after replacing control-character regexes with explicit character checks.

The test output contained Node's existing `punycode` deprecation warning. The first exploratory run exposed a mismatch between the `Attempted` test label and the rendered label, which was corrected. A subsequent T02 test run passed. The initial build also reported `no-control-regex`; the implementation was changed and the final build is warning-free.

## Orchestrator review follow-up

The first corrected validation test run failed because `TextEncoder` was unavailable in Jest's jsdom runtime. The client now uses `Blob.size`, which reports UTF-8 encoded bytes in browsers and jsdom, for file and serialized request sizing.

4. `npm test -- --runInBand --watchAll=false --silent StudentTickets.test.tsx -t "valid submission|Unicode code-point|rejects query markers|serialized request"` — exit 0; 1 suite passed; 4 tests passed, 9 skipped.
5. `npm test -- --runInBand --watchAll=false --silent StudentTickets.test.tsx -t "direct entry|visitor is returned|required fields|language is a fixed-choice|valid submission|Unicode code-point|rejects query markers|serialized request|stays on the form"` — exit 0; 1 suite passed; 11 tests passed, 2 skipped (T03 entry-point cases).
6. `npm test -- --runInBand --watchAll=false --silent server.test.js` — exit 0; 2 suites passed; 10 tests passed.
7. `npm run build` — exit 0; optimized production build compiled successfully.
