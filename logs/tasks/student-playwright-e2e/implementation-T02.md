# T02 execution log

- First `firebase emulators:start --only firestore --project demo-codeclinic` attempt: exit 1 with sandbox EPERM opening the Firebase CLI configstore file; no emulator started.
- Retried with `XDG_CONFIG_HOME` set to a task-specific temp directory: emulator started on `127.0.0.1:8080`, demo project only. CLI noted nonfatal remote MOTD/config fetch failure. No production project was used.
- With the three pinned local target variables, `npx playwright test --grep 'Student can register'`: Chromium reported the core Student browser case passed in 9.0 seconds, but Playwright did not print a final summary or exit while its Express child remained listening on port 3100. The command was interrupted; exit 1. No assertion failure occurred.
- Repeated same command: Chromium reported the case passed in 6.5 seconds, then hung during teardown. `Stop-Process` of that run's Playwright-owned Express child allowed the command to finish: `1 passed (1.4m)`, `PLAYWRIGHT_EXIT=0`.
- Added `gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 }` to the allowed Playwright config and repeated. Chromium reported the case passed in 6.1 seconds, but teardown still hung. Manually stopping that run's owned Express child allowed completion: `1 passed (1.0m)`, `PLAYWRIGHT_EXIT=0`.

No test credentials, session data, or ticket contents were logged. The emulator was local and disposable.
