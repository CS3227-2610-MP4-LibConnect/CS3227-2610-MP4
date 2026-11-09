# T04 implementation report

Task: `student-tickets`, T04 only  
Approved contract: specification v0.3, checklist v0.2, handoff v0.2  
Dispatch: Batch 3, human-approved 2026-11-09  
Status: implementation and assigned verification complete; ready for independent review

## Changes

- Updated `docs/UserGuide.md` to describe the shipped Student ticket creation flow and distinguish it from ticket features not yet available.
- Updated `docs/DeveloperGuide.md` with the create route, UI/API trust boundary, C1 storage shape, verification locations, and create-only exclusions.
- Tightened the task-scoped UI test to assert padded uppercase tag normalization and rejection above five tags.
- Added reusable local verification scripts under the assigned `src/codeclinic/test/` paths: `emulator-C1-assertion.js`, `browser-inspection-server.js`, and `browser-inspection.js`. The browser static-file server validates containment using `path.relative`.
- Added task-local factual logs and screenshots under `logs/tasks/student-tickets/`.
- No production source, dependencies, CI, or approval state changed.

## Criteria and evidence

| T04 criterion | Result | Evidence |
| --- | --- | --- |
| Focused UI/API/storage tests | Pass: 3 suites, 59 tests | [`implementation-T04-focused-final.log`](../../../logs/tasks/student-tickets/implementation-T04-focused-final.log) |
| Full project tests | Pass: 41 suites, 738 tests; 3 suites and 3 tests skipped | [`implementation-T04-full-test-final.log`](../../../logs/tasks/student-tickets/implementation-T04-full-test-final.log) |
| Production build | Pass: optimized build compiled | [`implementation-T04-build.log`](../../../logs/tasks/student-tickets/implementation-T04-build.log) |
| Firestore emulator C1 assertion | Pass: exact C1 keys, owner and `OPEN` state, Timestamp types, null/empty optional values, one ticket write, unchanged notifications, synthetic record deleted | [`implementation-T04-emulator-final.log`](../../../logs/tasks/student-tickets/implementation-T04-emulator-final.log), reproducible script [`emulator-C1-assertion.js`](../../../src/codeclinic/test/emulator-C1-assertion.js) |
| Browser keyboard and 320 CSS-pixel inspection | Pass in local headless Chrome on the optimized build: `documentElement.scrollWidth` and viewport are both 320; no horizontal overflow; every listed control fits within 320px; Tab reaches the title and submit action; Space activation focuses the first invalid field and exposes its associated error. Top and lower form regions were visually inspected. | [`implementation-T04-browser.json`](../../../logs/tasks/student-tickets/implementation-T04-browser.json), [`browser-inspection-320-top.png`](../../../logs/tasks/student-tickets/browser-inspection-320-top.png), [`browser-inspection-320-bottom.png`](../../../logs/tasks/student-tickets/browser-inspection-320-bottom.png), [`implementation-T04-browser-run.log`](../../../logs/tasks/student-tickets/implementation-T04-browser-run.log) |
| User and Developer Guide | Pass | [`UserGuide.md`](../../../docs/UserGuide.md), [`DeveloperGuide.md`](../../../docs/DeveloperGuide.md) |

The browser inspection used a local loopback server that served the optimized build and stubbed only the session, CSRF, and ticket-create responses with synthetic values. It verifies browser rendering and keyboard behavior; it is not evidence of browser-to-real-API authentication or storage. The actual API and storage paths are covered separately by the focused and full test suites and emulator assertion. CUA itself was unavailable with the reported message `Browsers: Error: The browser access host is unavailable.`

The v0.3 C1 shape and timestamp/null/empty evidence is present in both `student-tickets.storage.test.js` and the emulator assertion. UI evidence for the fixed seven-language selector, `Other` note, padded-uppercase tag normalization, rejection above five tags, and client limits is in `StudentTickets.test.tsx`; API evidence for language rejection, normalized and duplicate tags, text/source limits, and `files`/`repoFilePaths` is in `student-tickets.api.test.js`. Source inspection of the browser ticket component found only HTTP calls to `/api/auth/csrf` and `/api/tickets`; it contains no Firestore SDK import or collection access.

## Commands and results

Executed from `src/codeclinic`:

```powershell
npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api student-tickets.storage
# PASS — 3 suites, 59 tests

$env:CI = 'true'
npm test -- --runInBand --watchAll=false
# PASS — 41 suites and 738 tests; 3 suites and 3 tests skipped

npm run build
# PASS — optimized production build compiled

$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
$env:XDG_CONFIG_HOME = (Resolve-Path ..\..\logs\tasks\student-tickets).Path
$env:NODE_PATH = (Resolve-Path node_modules).Path
firebase emulators:exec --only firestore --project demo-codeclinic-t04 --config ..\..\logs\tasks\student-tickets\firebase-T04.json --non-interactive "node .\test\emulator-C1-assertion.js"
# PASS — local emulator on port 8180; isolated demo project; synthetic ticket deleted

node .\test\browser-inspection.js
# PASS — local Chrome; optimized build with synthetic local endpoint stub; 320px and keyboard assertions passed

git diff --check
# PASS — no whitespace errors; Git printed existing LF/CRLF notices for changed and unrelated working-tree files
```

Complete output is retained in the linked logs. The full test run printed existing React `act(...)` console warnings from `NotificationBell`, and Node emitted deprecation warnings; neither caused a failure.

## Setup notes and unresolved limits

- The OpenSpec CLI found the repository root but no CLI change named `student-tickets`. `workflow/README.md` maps OpenSpec references to the canonical `workflow/specs/` adapter, so no duplicate `openspec/` tree was created. The approved workflow spec/checklist/handoff versions were verified directly.
- The pre-existing listener on `127.0.0.1:8080` could not be tied to a known emulator process because Windows denied process metadata access. It was not written to or stopped. The C1 run used a separate `demo-codeclinic-t04` Firestore emulator on port 8180 and shut down the emulator it started.
- The Firebase CLI's MOTD/remote-config request was unavailable; the cached emulator still started and the assertion passed. Initial setup attempts also encountered the sandboxed default CLI-config `EPERM` and the occupied 8080 port. These did not affect the successful isolated run; details are in [`implementation-T04-setup.log`](../../../logs/tasks/student-tickets/implementation-T04-setup.log).
- The first local browser automation script draft had a Node module-syntax error. It was corrected before the successful run; the initial error is preserved in the setup log.
- No product requirement or implementation defect required a production-code change. T04 evidence is ready for an independent reviewer. This report does not update the shared checklist or approval state.

## Independent review follow-up: T04-W1

The independent review identified that the inspection server used `candidate.startsWith(root)`, which could admit a sibling directory whose path shared the build-root prefix. The original finding remains in [`review-T04.md`](review-T04.md).

Replaced the prefix check with a `path.relative` containment helper. It rejects `..`, parent-prefixed relative results, and absolute relative results while permitting files inside the build root. The browser inspection now asserts an in-root file is allowed and both a `build-private` sibling-prefix candidate and parent-directory escape are rejected. The direct assertion and rerun of the 320px/keyboard inspection passed; the rerun retained the same synthetic local API stub. See [`implementation-T04-W1-check.log`](../../../logs/tasks/student-tickets/implementation-T04-W1-check.log) and [`implementation-T04-W1-browser-run.log`](../../../logs/tasks/student-tickets/implementation-T04-W1-browser-run.log). This changes only the test-only verification harness; no production code or shared approval state changed.
