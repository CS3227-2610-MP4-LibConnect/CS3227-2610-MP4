# Batch 6 dispatch proposal: T08 combined verification

Status: **PENDING HUMAN APPROVAL FOR BATCH 6 T08 DISPATCH** (2026-11-11).

Specification v0.5, checklist/handoff v0.5, and batch plan v0.3 are human-approved. T01–T07 and T09 are checked complete after independent reviews. Batch 5's Student UI correction passed independent review with follow-up; both implementer and reviewer passed 2 focused suites/13 tests and compiled the build. `assignment-batch-5.json` passed the complete validator before T09 was checked. The earlier `batch-5-dispatch-proposal.md` for T08 was never approved and is superseded by this Batch 6 proposal.

After this proposal was drafted, the human reported a Create Ticket `AI_INVALID_OUTPUT` 503 on “improve ticket wording” and separately approved a narrow T02 prompt/schema correction. `implementation-wording-reply-correction.md` and `review-wording-reply-correction.md` record independent pass with follow-up: both focused runs passed 3 suites/104 tests and both builds compiled. The deployed provider's actual rejected response remains unknown. This correction does not approve T08 dispatch or provider access.

## Ordered verification and evidence

1. Add focused Student test coverage requested by earlier reviewers: detail-chat CSRF denial before ticket/reply reads, malformed JSON and 128 KiB body handling; create-route gateway error mappings; full Student draft/reply redaction capture at the fake-provider boundary. Preserve earlier failure evidence and report any newly failing suite.
2. Run the relevant Student UI, server API, feature, shared AI gateway, and accessibility-state tests with fake providers, plus the production build. Inspect test scripts first; store complete output in task-local logs. Do not run TA-specific tests or inspect TA files.
3. Conduct an independent adversarial review using synthetic Student ticket/draft/question/history/reply/model-output cases. Probe solution leakage, code/patch-shaped output, prompt injection, unauthorized context, and secret-shaped values through fake-provider tests or source reasoning. Record exact synthetic examples and remaining semantic limits without raw private data.
4. Reconcile A1–A9 in an implementation report and independent security/review report. Include the T09 popup behavior in combined verification. Leave the human browser and separately authorized deployed-model compatibility checks open until actually observed. Do not claim deployment readiness or merge approval from passing local tests.

## Proposed assignment boundary

- One T08 implementer: `/root/batch6_implementer`; a different independent reviewer: `/root/batch6_reviewer`. Because `.git` is read-only, use the existing shared-workspace separation exception and record the exact Student-only diff.
- Test allowlist: `src/codeclinic/test/student-help-chat.api.test.js`, `student-ticket-help.feature.test.js`, `StudentTicketHelpChat.test.tsx`, `StudentHelpChat.test.tsx`, and `ai-gateway.test.js` only for relevant Student/shared AI boundary assertions. No production source edit is preapproved in T08; a discovered defect returns to the orchestrator for a scoped correction and review.
- Evidence allowlist: `workflow/tasks/ai-error-explainer/implementation-T08.md`, `review-T08.md`, `security-review-T08.md`, corresponding factual logs and full outputs under `logs/tasks/ai-error-explainer/`, and final `implementation-report.md` owned by the orchestrator after reconciliation.
- Selected implementation skill: `openspec-apply-change` through the `workflow/specs/` adapter. No TA files/tests, provider/network/credential access, dependency, CI/deployment, public action, or external message is approved. `Overview.md` and `workflow/PLAN.md` reconciliation remains outside this batch.

## Human verification still required

At a **320 × 640 CSS-pixel viewport**, sign in as an active Student and open `/student/tickets/new`, then an owned `/student/tickets/:ticketId`. On each route, open the lower-right **Ticket help bot** and check that the side popup fits without horizontal overflow or shifting ticket content, long text and history scroll, the ticket page remains usable, and Tab/Shift+Tab focus stays visible and unobscured. Check Escape and close-button focus return, close/reopen history retention, refresh reset, screen-reader labels and status announcements. Use synthetic content and avoid secrets. Report observations; provide only a relevant 320-pixel screenshot if a layout issue needs assessment. This criterion stays open until the human reports it.

A separate human authorization is required before any live provider/model compatibility smoke check involving credentials or external service access. Without it, T08 records deployment readiness as open.

**Decision requested:** approve Batch 6 T08 Student-only combined verification and independent review under this scope. Human visual observations and any later provider smoke authorization remain separate.
