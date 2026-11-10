# T04 factual execution log

Task: `student-tickets`, Batch 3 T04; approved specification v0.3 and checklist/handoff v0.2. All data was synthetic and local. Full output is retained in the linked logs.

| Check | Result | Full evidence |
| --- | --- | --- |
| `npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api student-tickets.storage` from `src/codeclinic` | Pass: 3 suites, 59 tests | [`implementation-T04-focused-final.log`](implementation-T04-focused-final.log) |
| `$env:CI = 'true'; npm test -- --runInBand --watchAll=false` from `src/codeclinic` | Pass: 41 suites and 738 tests; 3 suites and 3 tests skipped | [`implementation-T04-full-test-final.log`](implementation-T04-full-test-final.log) |
| `npm run build` from `src/codeclinic` | Pass: optimized build compiled | [`implementation-T04-build.log`](implementation-T04-build.log) |
| `firebase emulators:exec --only firestore --project demo-codeclinic-t04 --config ../../logs/tasks/student-tickets/firebase-T04.json --non-interactive "node ./test/emulator-C1-assertion.js"` from `src/codeclinic`, with task-local CLI config and local module path | Pass: exact C1 shape, Timestamp/null/empty initial values, one synthetic write, no Notification delta; synthetic record deleted; isolated emulator stopped | [`implementation-T04-emulator-final.log`](implementation-T04-emulator-final.log) |
| `node ./test/browser-inspection.js` against local Chrome and synthetic loopback API responses | Pass: 320 CSS-pixel width without overflow; controls inside viewport; keyboard submission focuses first invalid title with associated error | [`implementation-T04-browser-run.log`](implementation-T04-browser-run.log), [`implementation-T04-browser.json`](implementation-T04-browser.json), [top](browser-inspection-320-top.png), [bottom](browser-inspection-320-bottom.png) |
| `git diff --check` | Pass | implementation report |

The browser check used synthetic session, CSRF, and ticket responses; it did not test browser-to-real-API authentication or persistence. The API suites and isolated emulator check provide separate backend evidence. The CUA browser host remained unavailable.

The first Firebase setup encountered restricted CLI config access and an occupied port 8080; the final run used a separate demo emulator on port 8180 without touching the pre-existing listener. The first browser script draft had a syntax error; both events and their corrections are retained in [`implementation-T04-setup.log`](implementation-T04-setup.log). The reviewer later found a local browser-server containment issue T04-W1; its fix, direct check, and browser rerun are retained in [`implementation-T04-W1-resolution.log`](implementation-T04-W1-resolution.log) and [`implementation-T04-W1-browser-run.log`](implementation-T04-W1-browser-run.log). The independent re-review passed.
