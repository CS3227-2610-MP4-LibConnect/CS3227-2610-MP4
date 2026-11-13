# Batch 2 dispatch proposal

Version: 0.1 (2026-11-13; human approved in conversation)
Task: `student-playwright-e2e`, final singleton T03.
Prerequisites: specification, checklist, and handoff v0.1 approved; Batch 1 T01/T02 reviewed pass with follow-up and marked complete. See `assignment-batch-1.json`, `review-report.md`, and the correction log.

One implementer will run and, only where needed, correct the prepared second-Student browser case in `src/codeclinic/test/e2e/student-workflows.spec.ts`. It must verify that the other Student sees no owner ticket in My Tickets or at a direct detail URL, while the owner retains access. The implementer will run the full two-case `npm run test:e2e` suite against the disposable `demo-codeclinic` emulator, relevant existing Jest tests, and `npm run build`. It may use `npm ci --offline` to check the lockfile normalization risk; an online package download is outside this batch. It will record exact results, including any failure, in `implementation-T03.md` and a task-local log.

The exact implementation allowlist is `src/codeclinic/test/e2e/student-workflows.spec.ts`, `src/codeclinic/README.md`, `workflow/tasks/student-playwright-e2e/implementation-T03.md`, and `logs/tasks/student-playwright-e2e/implementation-T03.md`. No package/config/helper, product code, CI, DG/UG, specification, checklist, or handoff edit is authorized. A different reviewer will independently inspect T03 and the combined suite, record a separate verdict and security review, and note any browser run it did not independently execute. Shared-workspace review requires a recorded separation exception and full diff inspection because the task files are uncommitted.

After independent review, the orchestrator will reconcile the manifest and checklist, then present the completed implementation and unresolved risks for the human merge decision. This proposal is planning context; the human approval evidence is recorded separately in `approval-batch-2.md`.
