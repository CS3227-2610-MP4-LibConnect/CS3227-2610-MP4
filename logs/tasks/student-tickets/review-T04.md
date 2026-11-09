# T04 independent review execution log

Date: 2026-11-09 (Asia/Singapore)  
Task contract: `workflow/specs/student-tickets.md` v0.3; `workflow/tasks/student-tickets/tasks.md` v0.2; `workflow/tasks/student-tickets/handoff.md` v0.2; Batch 3 assignment T04.

## Review scope

Read `AGENTS.md` and `workflow/agents/reviewer.toml`; verified the navigation index, approved spec/checklist/handoff versions, assignment and dispatch approval evidence, T04 implementation/security reports, T04 test/build/emulator/browser logs, T01 correction re-review, and the T04 guide/test/script changes. Inspected ticket routing, input validation, Firestore store, create-page UI, browser collection boundary, server mounting, and registration regression correction. Inspected retained 320px screenshots and browser result JSON.

## Commands run

From `src/codeclinic`:

```powershell
npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api student-tickets.storage
```

Result: **PASS**, 3 suites passed, 59 tests passed. Full output: [`review-T04-focused-run.log`](review-T04-focused-run.log).

From `src/codeclinic` with task-local Firebase CLI config and package module path:

```powershell
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
$env:XDG_CONFIG_HOME = (Resolve-Path ..\..\logs\tasks\student-tickets).Path
$env:NODE_PATH = (Resolve-Path node_modules).Path
firebase emulators:exec --only firestore --project demo-codeclinic-t04 --config ..\..\logs\tasks\student-tickets\firebase-T04.json --non-interactive "node .\test\emulator-C1-assertion.js"
```

Result: **PASS**. Exact C1 keys, owned `OPEN` record, Timestamp values, null/empty fields, one ticket write, unchanged notification count, and deletion of the synthetic record were asserted. Emulator output: [`review-T04-emulator-run.log`](review-T04-emulator-run.log).

The available browser inventory check returned `Browsers: Error: The browser access host is unavailable`. No browser action was performed. The already-retained headless Chrome result was inspected instead; it clearly states that the session, CSRF, and create responses are synthetic.

## Retained verification reviewed

- `implementation-T04-full-test-final.log`: 41 suites passed, 738 tests passed; 3 suites/tests skipped.
- `implementation-T04-build.log`: optimized production build compiled successfully.
- `implementation-T04-browser.json` and `implementation-T04-browser-run.log`: 320px viewport and document width; no horizontal overflow; focus order reaches title and submit; invalid submit focuses title and exposes its error.
- `browser-inspection-320-top.png` and `browser-inspection-320-bottom.png`: visually reviewed for clipping and form usability.
- `implementation-T04-emulator-final.log`: prior successful isolated C1 run; independently repeated above.
- `workflow/tasks/student-tickets/review-T01-wiring.md`: final T01 correction verdict pass; registration middleware regression fixed and affected focused tests passed.

## Findings and limits

Finding T04-W1 is recorded in [`workflow/tasks/student-tickets/review-T04.md`](../../../workflow/tasks/student-tickets/review-T04.md): the loopback test server uses a path string-prefix containment check that can accept a sibling directory whose name begins with `build`. This is low severity and limited to the local inspection harness.

The run emitted the expected Firebase CLI offline/MOTD warning and default-open emulator warning (no rules file); the emulator used the isolated demo project on loopback and shut down after passing. No credentials or real user data were included in this log.

## T04-W1 re-review

Inspected the implementation's `path.relative`-based `isWithinRoot` helper in `src/codeclinic/test/browser-inspection-server.js` and the in-root, sibling-prefix, and parent-escape assertions in `src/codeclinic/test/browser-inspection.js`.

Independent direct containment check, from `src/codeclinic`:

```powershell
node -e "const a=require('node:assert/strict');const p=require('node:path');const {isWithinRoot,root}=require('./test/browser-inspection-server');a.equal(isWithinRoot(root,p.join(root,'index.html')),true);a.equal(isWithinRoot(root,p.resolve(root+'-private','secret')),false);a.equal(isWithinRoot(root,p.resolve(root,'..','secret')),false);console.log('PASS: in-root accepted; sibling-prefix and parent escapes rejected')"
```

Result: **PASS**. Full output: [`review-T04-W1-check.log`](review-T04-W1-check.log).

Reviewed `implementation-T04-W1-browser-run.log` and the updated browser JSON: the implementer reran the 320px/keyboard inspection with containment assertions passing. I did not rerun the browser script because CUA inventory remains unavailable and no listener was present on the script's Chrome CDP port 9225; the script would overwrite retained screenshot/JSON evidence. Synthetic session/CSRF/ticket responses remain the stated limit.

The `path.relative` fix closes T04-W1. Final re-review verdicts: **T04 pass; combined T01–T04 pass**. No checklist or approval state changed.
