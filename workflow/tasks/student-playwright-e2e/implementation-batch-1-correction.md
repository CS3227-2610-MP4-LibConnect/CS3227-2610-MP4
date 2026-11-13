# Batch 1 T01/T02 correction report

Approved specification `workflow/specs/student-playwright-e2e.md` v0.1; approved correction `batch-1-correction-proposal.md` v0.1 and `approval-batch-1-correction.md`.

Status: **T01 complete for Batch 1 scope; T02 complete for Batch 1 scope**, pending independent review. `playwright.config.ts` now uses the approved `test/e2e/playwright-server.cjs` global setup instead of Playwright's Windows `webServer` path. The helper starts a direct Express child with the pinned demo emulator target, waits for loopback readiness, and stops that exact child on teardown. Trace, screenshot, and video remain off; no production URL fallback exists.

Verification: missing emulator rejected before browser actions; two tests listed; `npm run test:e2e -- --grep 'Student can register'` built successfully, passed one Chromium journey, exited 0 unattended, and left port 3100 closed. Exact commands and results are in [the correction log](../../../logs/tasks/student-playwright-e2e/implementation-batch-1-correction.md).

Changed files in this correction: `src/codeclinic/playwright.config.ts`, `src/codeclinic/test/e2e/playwright-server.cjs`. No product server, package dependency, CI, DG/UG, specification, checklist, handoff, or T03 test changes.

Remaining risks and gates: the second-Student ownership case is unrun and belongs to T03 after independent review and a later approved batch. The correction has not had independent review. A fresh checkout and `npm ci` remain unverified, and the prior npm audit findings remain outside this task's remediation scope. The Firebase CLI needed a temp `XDG_CONFIG_HOME` under the sandbox; this did not change the app target.
