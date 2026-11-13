# Batch 1 correction independent review log

Date: 2026-11-13. Scope: approved T01/T02 lifecycle correction only. Specification/checklist/handoff v0.1; correction approval in `approval-batch-1-correction.md`. No production/test/config/package file was edited by the reviewer, and no cloud or external service was run.

| Check | Exact result |
| --- | --- |
| Read correction approval/proposal, updated assignment, T01/T02 reports, correction report/log, prior review, full new helper and changed config | Completed. Correction changes are the approved `playwright.config.ts` and `test/e2e/playwright-server.cjs`. |
| `node src/workflow/validate-assignment.mjs workflow/tasks/student-playwright-e2e/assignment-batch-1.json plan` | Exit 0: `Assignment batch 1 plan checks passed. Human approval and evidence review remain separate.` |
| `Test-NetConnection 127.0.0.1 -Port 8080 -InformationLevel Quiet`; same for port 3100 | Both `False` before review execution. |
| With pinned target variables, `.\node_modules\.bin\playwright.cmd test --list` in `src/codeclinic` | Exit 0; total 2 tests in 1 file, core journey and ownership case. |
| With pinned target variables and no emulator, `.\node_modules\.bin\playwright.cmd test --grep 'Student can register'` | Exit 1 at `playwright-server.cjs:61`: `Local Firestore emulator is unavailable.` No browser case ran. |
| `Test-NetConnection 127.0.0.1 -Port 3100 -InformationLevel Quiet` after absent-emulator check | `False`; the helper did not leave an app listener. |
| `git diff --check -- src/codeclinic/.gitignore src/codeclinic/README.md src/codeclinic/package-lock.json src/codeclinic/package.json` | No whitespace errors in the tracked Batch 1 files; Git printed line-ending conversion notices. |

I inspected the helper's success and catch paths for child cleanup. The helper validates the exact local mode/project/host, checks the emulator's `/` response, refuses a preoccupied port, spawns `process.execPath` directly with `windowsHide`, and stops/waits for the spawned child. The implementer correction log reports a built core Chromium run with `1 passed (12.6s)`, exit 0 without manual termination, followed by a closed port 3100. I did not rerun that browser case because the emulator was down and starting Firebase CLI was outside this review's external-service boundary; the implementer's result is cited as implementation evidence, not an independent browser pass. The T01 report's old “webServer startup” phrase is stale relative to the corrected globalSetup path.
