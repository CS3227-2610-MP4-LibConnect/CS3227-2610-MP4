# Student ticket help chatbot: specification-stage security review

Version: 0.2 (2026-11-11)
Specification: `workflow/specs/ai-error-explainer.md` v0.2
Approval evidence: human “approved” reply in this conversation after v0.2 presentation. No source or tests have changed.

| Risk | Required control | Verification |
| --- | --- | --- |
| Cross-student or TA access | Fresh server session, active Student account, ownership check before reply reads or gateway call; missing and non-owned tickets both 404. | A4 negative API tests. |
| Unsubmitted draft crosses trust boundary | Server validates a complete, bounded snapshot; draft fields remain data, never authority; no client-selected ticket or account lookup. | A2/A4 create-route tests and prompt capture. |
| Former or unrelated TA text sent to provider | Server filters reply `authorUserId` against owner and current `claimedByTaId`; never trusts display labels. | A5 pagination and reassignment tests. |
| Prompt injection through ticket, file, reply, or question | Fixed system prompt, delimited data, no tools, strict JSON parser, output policy filter, no model-authorized writes. | A6 injection suite and manual adversarial review. |
| Complete solution or answer leakage | Hint and refinement schemas, length limits, solution-pattern rejection, fail-closed fallback. Semantic leakage remains a model risk and requires manual review. | A1/A2/A3/A6 tests and manual review; do not claim an absolute guarantee. |
| Secrets or private data sent to provider | Minimal context allowlist, no account identifiers, shared redaction, user warning, no raw content logs or chat persistence. Pattern redaction cannot catch every secret. | A2/A5/A6/A8 tests. |
| Unbounded context or resource use | Bounded draft body and reply page reads, stop once cap exceeded, gateway input/output caps and rate limits. | A5/A7 tests. |
| Browser exposure | Student-only create/detail chat, plain-text rendering, no browser provider call or stored transcript, no-store API. | A4/A8 UI and bundle tests. |
| AI suggestions mutate a ticket or hide a solution | Chat-only refinement shape, no apply/autofill action, no write endpoint, output policy covers refined fields and attached-code suggestions. | A2/A3/A6 tests. |

Unresolved: exact provider-safe caps and human visual/adversarial verification. These are required before accepting implementation.
