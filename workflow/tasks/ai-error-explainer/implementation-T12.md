# T12 implementation: Student prompt regression tests

Specification: `workflow/specs/ai-error-explainer.md` v0.6, R3–R5 and A1/A3/A6/A7. Approved checklist `tasks.md` v0.7, handoff v0.7, and Batch 8 dispatch. T11 implementation evidence is in `implementation-T11.md`.

Changed `src/codeclinic/test/student-ticket-help.feature.test.js` only for T12. Added prompt assertions for all approved no-go categories and the concept-question `HINT`/sparse-context `CLARIFICATION` path. Registered fake-provider cases accept a grounded concept `HINT` for both create and detail contexts and an on-topic clarification for a sparse create draft. A fail-closed matrix rejects malformed, overlong, code-like, URL-bearing, credential-bearing, and complete-solution replies for the same concept question.

Verification from `src/codeclinic`:

- `CI=true npm test -- --watch=false --runInBand --forceExit --runTestsByPath test/student-ticket-help.feature.test.js test/ai-gateway.test.js test/student-help-chat.api.test.js`: exit 0; 3 suites / 123 tests passed. Full output: `logs/tasks/ai-error-explainer/implementation-T12-test.txt`.
- `CI=true npm run build`: exit 0; compiled successfully. Full output: `logs/tasks/ai-error-explainer/implementation-T12-build.txt`.
- `git diff --check -- src/codeclinic/server/ai/student-ticket-help.js src/codeclinic/test/student-ticket-help.feature.test.js`: exit 0 (only Git line-ending notices).

Remaining risks: fake-provider success validates the response boundary but cannot establish the deployed model's response or the cause of the reported 503. No live provider or credential access occurred. Independent review of T11, T12, and the combined change remains pending. The shared checklist is intentionally unchanged for orchestrator reconciliation.
