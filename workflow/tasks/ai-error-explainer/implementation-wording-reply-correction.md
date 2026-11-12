# T02 Create Ticket wording reply correction: implementation handoff

Status: **implementation complete; independent review pending**. Specification: `workflow/specs/ai-error-explainer.md` v0.5. Checklist and handoff: v0.5. Scope approval: `wording-reply-failure-proposal.md`, explicitly approved by the human on 2026-11-12 after confirming the Create Ticket page.

## Changes and acceptance

- `src/codeclinic/server/ai/student-ticket-help.js`: the fixed server prompt now states one raw JSON object, exact variant keys, text lengths, create-only refinement fields, 1–10 suggestions of at most 64 UTF-16 code units, and an on-topic clarification for a sparse draft. The parser, output safety filters, no-repair behavior, caps, endpoints, and detail handling were not changed.
- `src/codeclinic/test/student-ticket-help.feature.test.js`: fake-provider tests for the exact “improve ticket wording” Create Ticket question accept a valid grounded refinement and a sparse-draft clarification; malformed, fenced, overlong, and unsafe replies remain `AI_INVALID_OUTPUT`. The test also checks the system prompt's schema guidance. Existing detail-refinement rejection still passes.
- T02 correction criteria are met locally within the approved two-file source/test scope. No requirement, data model, authorization policy, or state machine changed. No scope deviation.

## Verification and open risks

Focused feature, gateway, and create-route tests: **3 suites, 104 tests passed**. Production build: **compiled successfully**. Commands, exact results, and full output are in [the execution log](../../../logs/tasks/ai-error-explainer/implementation-wording-reply-correction.md).

The deployed provider's actual rejected response was not accessed, so the cause of the reported 503 remains unconfirmed. Local fake-provider tests show contract behavior only. Live provider compatibility, output-token support, manual adversarial review, and the human visual check remain open under their separate gates. This correction is ready for a different agent's independent review; it does not advance T08 or merge approval.
