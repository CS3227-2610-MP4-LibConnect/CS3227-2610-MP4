# Student help prompt no-go correction: analyst handoff

Version: 0.1 (2026-11-12)
Task ID: `ai-error-explainer`
Approval state: **APPROVED**. The human explicitly approved this handoff v0.1 after separately approving the scope proposal and correction checklist v0.1. This handoff does not authorize implementation or external access. The canonical checklist and handoff amendments needed by the batch validator are proposed separately.

## Contract

- Canonical specification: `workflow/specs/ai-error-explainer.md` v0.6, R3–R5 and A1/A3/A6/A7. Approved correction scope and exact candidate wording: `no-go-prompt-correction-proposal.md`. Ordered correction checklist: `no-go-prompt-correction-checklist.md` v0.1.
- The short question “what are the concepts here” is allowed. The observed `AI_INVALID_OUTPUT` identifies an invalid model reply, without revealing which rule failed. No raw provider response is available. Do not claim prompt guidance resolves the live issue based on fake-provider tests.
- Implementer changes only `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`, completing C01 then C02 sequentially. A different reviewer inspects each and the combined change, recording independent evidence. The orchestrator owns checklist and handoff status.
- Keep server session/role/ownership checks, CSRF, request fields and limits, redaction, provider boundary, parser, output policy, rate limits, and UI messages unchanged. No new output kind, code examples, repair call, or fallback answer is authorized.
- Untrusted question, draft, files, ticket fields, history, and provider output remain data. Never log raw content or credentials. No provider call, shared preamble, TA feature, dependency, CI/deployment, push, or merge action is authorized by this handoff.

## Skills and verification

- Selected implementation skill: `openspec-apply-change` through the `workflow/README.md` specdocs path adapter, using the canonical `workflow/specs/` and `workflow/tasks/ai-error-explainer/` artifacts. Do not create a second specification tree. Planning follows this repository's staged workflow.
- Use fake-provider feature tests for accepted create/detail concept hints, sparse-create clarification, and rejected invalid/unsafe model replies. Check that prompt language names the no-go categories and still permits prose about concepts. Run focused Student AI feature/gateway/route tests and the production build; store complete output under `logs/tasks/ai-error-explainer/` and concise reports under `workflow/tasks/ai-error-explainer/`.
- Security review: prompt wording is advisory and does not replace parser and output validation. Overly broad wording could make the model refuse benign concept questions; overly narrow wording could invite code or answer leakage. Reviewer checks both directions. The model's actual 503 cause, deployed-model compatibility, semantic leakage, and arbitrary-secret detection remain unresolved without separately authorized provider/manual review.

After human approval of this handoff, the orchestrator must propose a bounded correction batch, validate its assignment plan, and request separate human approval for implementation dispatch.
