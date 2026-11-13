# Batch 1 correction proposal

Version: 0.1 draft (2026-11-13)
Task: `student-playwright-e2e`, Batch 1 T01/T02.
Sources: `implementation-T01.md`, `implementation-T02.md`, `review-report.md`, and their task-local logs.
Decision state: human approval pending. This proposal does not authorize a file outside the current assignment allowlist.

## Observed failure

The core Chromium test reached every assertion in three local-emulator runs. Playwright's `webServer` then left its Express child listening on Windows and the command hung. Two runs exited 0 only after manual termination of that child. The installed Playwright runner explicitly does not support `gracefulShutdown` on Windows, and the attempted config setting did not resolve the hang. The independent reviewer marked T01 and T02 changes required. Neither item is complete and T03 has not started.

## Proposed scoped correction

Extend the Batch 1 implementation allowlist by one file: `src/codeclinic/test/e2e/playwright-server.cjs`. Replace Playwright's shell-managed `webServer` with a `globalSetup` helper that starts `node server/index.js` as a direct child process with the pinned local emulator environment, waits for loopback readiness, and returns a teardown function that stops and waits for that exact child. Keep the existing configuration guard, loopback URL, single Chromium worker, and trace/screenshot/video defaults. Do not change product server code, the test scenarios, package dependencies, CI, or the canonical specification.

The implementer must rerun a bounded missing-emulator check and the core browser case through `npm run test:e2e` without manual process termination. Record the result and any remaining shutdown failure. A different reviewer must inspect the correction and independently assess T01 and T02 before T03 or checklist advancement. The helper must not send a signal to an unrelated process or leave an orphaned local server.

## Requested decision

Approve extending Batch 1's allowlist to `src/codeclinic/test/e2e/playwright-server.cjs` and dispatching the T01/T02 correction to the same implementer, followed by independent review. If the helper fails to give an unattended clean exit, stop and report the evidence before further changes.
