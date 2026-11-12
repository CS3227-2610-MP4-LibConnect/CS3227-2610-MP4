# Proposed implementation batches: ai-error-explainer

Version: 0.4 (2026-11-12)
Approval state: **APPROVED FOR v0.4 BATCH PLAN**. The human explicitly approved the revised Batch 6 T10 / Batch 7 T08 sequence in this conversation after separate specification, checklist, and handoff v0.6 approvals. Batch 6 implementation dispatch, Batch 7 dispatch, provider access, and merge remain separate gates. Earlier v0.3 Batch 5 T09 dispatch approval and Batch 1–4 approvals remain historical.
Batch 2 correction history: after independent review found T02 changes required, the human explicitly replied “approved” to `batch-2-correction-proposal.md` in this conversation. The initial assignment is retained as `assignment-batch-2-v0.1-historical.json`; the active `assignment-batch-2.json` records the narrow correction allowlist and review evidence. Batches 3 and 4 were subsequently approved, implemented, and independently reviewed.
Approved inputs: `workflow/specs/ai-error-explainer.md` v0.6; `workflow/tasks/ai-error-explainer/tasks.md` v0.6; `workflow/tasks/ai-error-explainer/handoff.md` v0.6. T01–T07 and T09 are complete under their prior reviewed batches; T10 and T08 remain open.

| Batch | Ordered items | Reason and dependency boundary |
| --- | --- | --- |
| 1 | T01 | Resume partial design under amended provisional caps; singleton for security-contract review before any prompt/route work. Design evidence only; no provider access or production mutation. |
| 2 | T02, T03 | Feature policy/response contract first, then the create-chat route that uses it. Requires completed and independently reviewed T01. |
| 3 | T04, T05 | Detail route/context scan first, then shared chat UI once both route contracts exist. Requires reviewed batch 2. |
| 4 | T06, T07 | Integrate create page, then detail page against the reviewed routes and shared UI. Requires reviewed batch 3. |
| 5 | T09 | Historical approved batch: corrected the shared Student UI to a floating side popup and obtained independent UI review. |
| 6 | T10 | Present the reviewed side popup with a messaging-style header, left/right message bubbles, scrollable conversation, and bottom composer. Singleton because this UI and accessibility change requires independent review before final combined verification. |
| 7 | T08 | Final singleton verification and evidence after the messaging-style popup is independently reviewed. The old Batch 6/T08 proposal was pending, never approved, and is retained as historical evidence. |

One implementer completes and verifies each item in a batch in order. A different reviewer checks each item and the combined batch before the next batch starts. Exact allowed files, worktrees, checks, and per-item evidence are recorded in each assignment manifest before dispatch. No TA feature file or TA test is in scope.

## Pre-implementation test evidence

The separate test writer added `src/codeclinic/test/StudentTicketHelpChat.test.tsx` and `src/codeclinic/test/student-help-chat.api.test.js`. The focused command and complete output are in `logs/tasks/ai-error-explainer/test-writer.md` and `student-help-chat-test-run-final.txt`: 2 suites / 12 tests fail because the proposed chat controls and routes do not exist yet. `test-coverage.md` maps A1–A9 and records gaps. No TA tests ran.

The tests currently cover observable Student UI, draft request, and rejection contracts. The HTTP success envelope is provisional. T01 must define it, and subsequent test work must reconcile that assumption. Gateway injection, context capture, eligible-reply paging, output-policy, and distinct failure tests remain open; they must be added with the relevant batches before their acceptance criteria are marked complete. The 320 CSS-pixel visual check and manual adversarial review remain human verification gates.

## Open decisions and boundaries

- Existing local AI gateway evidence does not identify a confirmed deployed model or its limits. The provisional 98,304-character input and 1,024-token output caps are size-based working limits, with a human/provider compatibility smoke check required before deployment readiness. A live provider call, credential access, or external service use needs separate approval; this plan does not grant it. The shared gateway rate-limit default remains unchanged.
- Redaction can miss arbitrary secrets, and deterministic filtering cannot prove the model will never disclose a solution semantically. Independent review and manual adversarial checks remain necessary.
- The old one-shot/ticket-rewrite wording in `Overview.md` and `workflow/PLAN.md` still needs later reconciliation under separately approved scope.
