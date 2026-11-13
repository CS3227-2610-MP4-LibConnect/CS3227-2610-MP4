# Proposed implementation batches: student-playwright-e2e

Version: 0.1 draft (2026-11-13)
Approved sources: `workflow/specs/student-playwright-e2e.md` v0.1; `tasks.md` v0.1; `handoff.md` v0.1. Human approval of this batch plan and implementation dispatch is pending.

## Test-writing result

The test writer prepared two cases in `src/codeclinic/test/e2e/student-workflows.spec.ts` and recorded coverage in `test-coverage-report.md` with exact checks in `logs/tasks/student-playwright-e2e/test-writer.md`. The orchestrator compared the key selectors with the current React pages. Neither case has run: Playwright, its configuration, and the Chromium browser are pending T01. The future configuration must pass the three pinned emulator variables and a loopback `baseURL` to workers; it must disable traces, screenshots, and video.

## Batch 1 — T01 then T02

One implementer completes T01, records its safe configuration and test-listing/missing-emulator evidence, then completes T02 and records a separate browser-journey result. T02 does not start if T01 fails or needs a new approval. A different reviewer checks each item and their combined change before Batch 2.

Expected allowlist: `src/codeclinic/package.json`, `src/codeclinic/package-lock.json`, `src/codeclinic/playwright.config.ts`, `src/codeclinic/.gitignore`, `src/codeclinic/README.md`, and prepared `src/codeclinic/test/e2e/*.spec.ts`, plus task-local reports and logs. The exact manifest must narrow this list before dispatch.

The batch needs explicit human approval to add `@playwright/test` as a development dependency and install its Chromium browser. The expected commands are `npm install --save-dev @playwright/test` and `npx playwright install chromium`, run from `src/codeclinic` after batch approval. These downloads access the npm and Playwright download services. They must not access the production app, production Firebase project, SoCLaaS, or a real account. Node and the Firebase CLI are already present locally; the Firestore emulator is the only data target.

## Batch 2 — T03

After Batch 1 independent review is reconciled, the same ordered implementation process adds and verifies the second-Student ownership scenario and completes documentation and required checks. A different reviewer independently checks owner isolation, both E2E cases, and the combined change. Because T03 is the final checklist item, this is a singleton batch.

Expected allowlist: `src/codeclinic/test/e2e/*.spec.ts`, `src/codeclinic/README.md`, and task-local reports and logs. Changes to configuration or package files require a new, specifically approved allowlist if Batch 1 review reveals a demonstrated need.

## Gates and evidence

Before each dispatch, create `assignment-batch-<n>.json`, run `node src/workflow/validate-assignment.mjs <manifest> plan`, and verify approval evidence. For each item, retain implementation and independent-review reports, exact commands/results in `logs/tasks/student-playwright-e2e/`, and unresolved risks. Review the complete batch before starting the next. A passing test or reviewer message cannot approve a gate. Human merge approval is required after final review. CI changes, cloud access, deployment, and publication are outside this plan.
