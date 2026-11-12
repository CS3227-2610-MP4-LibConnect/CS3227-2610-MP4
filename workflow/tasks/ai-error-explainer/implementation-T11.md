# T11 implementation: Student prompt no-go guidance

Specification: `workflow/specs/ai-error-explainer.md` v0.6, R3–R5 and A1/A3/A6/A7. Approved checklist `tasks.md` v0.7, handoff v0.7, and Batch 8 dispatch.

Changed `src/codeclinic/server/ai/student-ticket-help.js` only. The `ERROR_EXPLAINER` fixed system prompt now names the approved prohibited output categories, tells the model to use short natural-language prose, and explicitly routes ticket or draft concept questions to grounded `HINT` or sparse-context `CLARIFICATION`. It retains the existing raw JSON schema guidance, response lengths, and refusal path. No parser, filter, gateway, shared prompt, route, or UI behavior changed.

Verification: source inspection and a direct Node prompt-category check passed. The focused Student feature suite passed 1 suite / 59 tests with `CI=true npm test -- --watch=false --runInBand --forceExit --runTestsByPath test/student-ticket-help.feature.test.js` from `src/codeclinic`; full output is in `logs/tasks/ai-error-explainer/implementation-T11-test.txt`. The first run without `--forceExit` produced the same passing suite summary but retained an open process and was interrupted; the final logged run exited 0.

Remaining risk: this prompt-only guidance does not identify the live `AI_INVALID_OUTPUT` cause or establish deployed-model compatibility. No provider call was made. T12 regression tests and independent review remain pending.
