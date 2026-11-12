# Pre-implementation test coverage: ai-error-explainer

Specification: `workflow/specs/ai-error-explainer.md` v0.2 (approved). Checklist: `workflow/tasks/ai-error-explainer/tasks.md` v0.1 (approved). Handoff: `workflow/tasks/ai-error-explainer/handoff.md` v0.1 (approved).

## Tests added

| Acceptance criteria | Planned assertions in the focused tests | Coverage limits |
| --- | --- | --- |
| A1 | Create-page local opening message; no request on open; create help route contract exercised by request tests. | UI and route currently absent, so all assertions fail pre-implementation. Successful fake-provider hint behavior is not covered. |
| A2 | Create send includes every named draft field, including blanks and attached file data; latest visible title remains unchanged; no ticket submission; CSRF header and route path. | Second-turn fresh snapshot and model captured-context redaction are not tested. Request/response envelope is assumed provisionally because its wrapper is unspecified. |
| A3 | Owned detail page offers chat after load; sends a question without draft; displays a hint and has no apply/update control. | Detail route context grounding, mutation-store assertion, and refinement rejection depend on server test seams not present yet. |
| A4 | Visitor, TA, inactive Student, password-change-required Student, another Student's ticket, and detail draft-forgery requests are checked for denial before protected reply reads. | No provider mock seam exists in `createTicketsRouter`, so no-provider-call cannot be asserted directly. |
| A5 | — | Reply pagination, author filtering, reassignment, identifier-free provider context require an injectable gateway/context capture and store paging seam; deferred. |
| A6 | — | Prompt injection and adversarial model-output policy have no observable feature parser/filter test seam yet; semantic safety requires the separately required human review. |
| A7 | Create chat network failure keeps the question and draft and does not show the raw error. | Distinct rate-limit, provider, invalid-output, oversized-input, and storage mappings are not covered until route/UI error codes and fake-gateway seam are available. |
| A8 | Chat state is page-local across unmount/remount; no local/session storage writes are observed. | Navigation/logout/tab-close and bounded prior-history transmission are not covered. No persistence on the unimplemented UI is necessarily an incomplete implementation result. |
| A9 | Focusable named controls and announced status are asserted when implemented. | jsdom cannot verify browser layout, visible focus styling, screen-reader behavior, or 320 CSS-pixel overflow. Per `AGENTS.md`, the human browser check remains required. |

## Assumptions and gaps

- Tests use the specified public route paths and specified request fields. Create and detail response bodies use a provisional direct JSON shape for hint/refinement data; the spec defines model response schemas but does not define an HTTP response envelope. Reconcile this assumption with the implementation contract before relying on response-shape assertions.
- CSRF is requested from the existing `/api/auth/csrf` endpoint before POST, following the existing Student ticket page pattern.
- T01 has not selected provider-safe caps. The tests intentionally do not assert a numeric cap, individual field bounds, or exact model response string limits.
- Test injection cannot currently reach the shared AI gateway through the Student ticket router. Do not infer provider non-use solely from the route store spies.
- Automated browser layout and manual adversarial review are explicitly open criteria.

The exact command and pre-implementation results are recorded in [`test-writer.md`](../../../logs/tasks/ai-error-explainer/test-writer.md); complete captured output is in [`student-help-chat-test-run-final.txt`](../../../logs/tasks/ai-error-explainer/student-help-chat-test-run-final.txt). The initial run before the final test edits is preserved in [`student-help-chat-test-run.txt`](../../../logs/tasks/ai-error-explainer/student-help-chat-test-run.txt).
