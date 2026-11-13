# Batch 1 T01/T02 correction execution log

Specification `workflow/specs/student-playwright-e2e.md` v0.1; approved correction `approval-batch-1-correction.md`.

- Replaced Playwright `webServer` with `globalSetup` calling the newly approved `test/e2e/playwright-server.cjs`. The helper validates the pinned emulator target, probes the local emulator, checks that port 3100 is free, spawns `node server/index.js` directly, waits up to 30 seconds for loopback HTTP readiness, and returns a teardown that stops and waits for that exact child.
- With pinned variables and no emulator, `npx playwright test --grep 'Student can register'; Write-Output "PLAYWRIGHT_EXIT=$LASTEXITCODE"`: output `Local Firestore emulator is unavailable.` and `PLAYWRIGHT_EXIT=1`; no browser action or app server startup.
- Started `firebase emulators:start --only firestore --project demo-codeclinic` with task-specific temp `XDG_CONFIG_HOME`: demo Firestore ready at `127.0.0.1:8080`. CLI printed a nonfatal remote MOTD/config fetch warning.
- With pinned variables and emulator running, `npm run test:e2e -- --grep 'Student can register'; Write-Output "E2E_EXIT=$LASTEXITCODE"`: build compiled successfully; 1 Chromium test passed in 7.9 seconds; Playwright summary `1 passed (12.6s)`; `E2E_EXIT=0`. No manual process termination.
- With pinned variables, `npx playwright test --list; Write-Output "LIST_EXIT=$LASTEXITCODE"`: 2 tests in 1 file; `LIST_EXIT=0`.
- `Test-NetConnection 127.0.0.1 -Port 3100 -InformationLevel Quiet` after the run: `False`; helper left no listening Express server. Stopped the disposable emulator; no production or cloud target was used by the test runner.

No credentials, sessions, or ticket contents were logged. T03 ownership test remained listed but was not executed.
