# Batch 5 dispatch proposal: T08 combined verification

Status: **PENDING HUMAN APPROVAL FOR BATCH 5 DISPATCH** (2026-11-11).

Approved specification v0.4, checklist v0.3, and handoff v0.3 control this Student-only work. T01–T07 are checked complete after independent review of Batches 1–4. Batch 4's Student UI/component tests passed 2 suites/12 tests and its build compiled; `assignment-batch-4.json` passed the complete validator before checklist reconciliation. The approved batch plan v0.2 places T08 as the final singleton, but its implementation dispatch still needs separate human approval.

## Ordered verification and evidence

1. Add focused Student test coverage requested by earlier reviewers: detail-chat CSRF denial before ticket/reply reads, malformed JSON and 128 KiB body handling; create-route gateway error mappings; full Student draft/reply redaction capture at the fake-provider boundary. Preserve the earlier failure evidence and report any newly failing suite.
2. Run the relevant Student UI, server API, feature, shared AI gateway, and accessibility-state tests with fake providers, plus the production build. Inspect test scripts first; store complete output in task-local logs. Do not run TA-specific tests or inspect TA files.
3. Conduct an independent adversarial review using synthetic Student ticket/draft/question/history/reply/model-output cases. Probe solution leakage, code/patch-shaped output, prompt injection, unauthorized context, and secret-shaped values through fake-provider tests or source reasoning. Record exact examples and remaining semantic limits without raw private data.
4. Reconcile A1–A9 in an implementation report and independent security/review report. Leave the human browser check and deployed-model compatibility open until actually observed. Do not claim deployment readiness or merge approval from passing local tests.

## Proposed assignment boundary

- One T08 implementer: `/root/batch5_implementer`; a different independent reviewer: `/root/batch5_reviewer`. Because `.git` is read-only, use the existing shared-workspace separation exception and record the exact Student-only diff.
- Test allowlist: `src/codeclinic/test/student-help-chat.api.test.js`, `student-ticket-help.feature.test.js`, `StudentTicketHelpChat.test.tsx`, `StudentHelpChat.test.tsx`, and `ai-gateway.test.js` only for relevant Student/shared AI boundary assertions. No production source edit is preapproved in T08; a discovered defect returns to the orchestrator for a scoped correction and review.
- Evidence allowlist: `workflow/tasks/ai-error-explainer/implementation-T08.md`, `review-T08.md`, `security-review-T08.md`, corresponding factual logs under `logs/tasks/ai-error-explainer/`, and final `implementation-report.md` owned by the orchestrator after reconciliation. Keep any full test/build output in task-local logs.
- No TA files/tests, provider/network/credential access, dependency, CI/deployment, public action, or external message is approved by this batch. The shared gateway default rate and provisional input/output caps remain unchanged. `Overview.md` and `workflow/PLAN.md` reconciliation remains outside this batch because it needs separate approval.

## Human verification still required

At a **320 × 640 CSS-pixel viewport**, sign in as an active Student and open `/student/tickets/new`. Use Tab/Shift+Tab and a screen reader to open **Ticket help bot**; confirm the local “What help do you need?” message, visible focus, announced status/errors, wrapped long text, and no horizontal overflow or obscured controls. Close and reopen to check history retention, then refresh to confirm it clears. Repeat on an owned `/student/tickets/:ticketId` after the ticket loads, checking that the control appears only there and the conversation remains scoped to that ticket. Use synthetic ticket content and avoid secrets. Report the observations; provide screenshots of the relevant 320-pixel view only if a layout problem needs assessment. This check is not marked passed until the human reports it.

A separate human authorization is required before any live provider/model compatibility smoke check involving credentials or external service access. Without it, T08 records the deployment-readiness criterion as open. The model's actual context limit and acceptance of `max_tokens = 1,024` remain unverified.

**Decision requested:** approve Batch 5 T08 Student-only verification and independent review under this scope. Human visual observations and any later provider smoke authorization remain separate.
