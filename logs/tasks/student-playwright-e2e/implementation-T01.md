# T01 execution log

- `openspec list --json`: root found at repository; `openspec status --change student-playwright-e2e --json` and `openspec instructions apply --change student-playwright-e2e --json`: CLI reported no native change. Used approved `workflow/specs/` adapter and task artifacts; did not create another spec tree.
- `npm install --save-dev @playwright/test`: first sandboxed attempt produced no output and was interrupted; approved escalated retry exited 0, added 3 packages, removed 89, audit reported 40 pre-existing or dependency-tree vulnerabilities (16 low, 11 moderate, 13 high). No audit fix was run.
- `npx playwright install chromium`: exit 0; Chromium, headless shell, and FFmpeg downloaded.
- With the three pinned local target variables, `npx playwright test --list`: exit 0; 2 tests listed.
- Without the three target variables, `npx playwright test --list`: exit 1 at configuration load with local emulator requirement; no browser started.
- `Test-NetConnection 127.0.0.1 -Port 8080 -InformationLevel Quiet`: `False` before emulator startup.
- `npm run build`: exit 0, compiled successfully.
- With pinned target variables but no running emulator, `npx playwright test --grep 'Student can register'`: exit 1; Express reported it could not start and Playwright webServer exited 1. No browser test started.
- Later T02 runs exposed a Windows teardown issue: Playwright's webServer left its Express child listening after the test checkmark, and the command did not exit until that owned child was manually stopped. Adding `gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 }` in the allowed config did not resolve it. Runner repeatability remains open.

All commands ran in `src/codeclinic` except the network probe. No production or cloud target was contacted by the test runner.
