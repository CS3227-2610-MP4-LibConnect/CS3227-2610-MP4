# Batch 7 dispatch proposal: T08 combined verification

Status: **APPROVED FOR BATCH 7 T08 DISPATCH** (2026-11-12). The human explicitly replied “approved” to this exact proposal in this conversation. Provider access and merge remain separate gates.

Specification, checklist, and handoff v0.6 and batch plan v0.4 are human-approved. T01–T07, T09, and T10 are checked complete after independent reviews. Batch 6's messaging-style Student popup passed independent review with follow-up; both implementer and reviewer passed 2 focused suites/14 tests and compiled the build. `assignment-batch-6.json` passed the complete validator before T10 was checked. The earlier unapproved Batch 6/T08 proposal and manifest are retained as v0.5 historical drafts; this Batch 7 proposal replaces them for the T08 decision.

The human reported a Create Ticket `AI_INVALID_OUTPUT` 503 on “improve ticket wording” and separately approved a narrow T02 prompt/schema correction. `implementation-wording-reply-correction.md` and `review-wording-reply-correction.md` record independent pass with follow-up: both focused runs passed 3 suites/104 tests and both builds compiled. The deployed provider's actual rejected response remains unknown. `human-visual-verification.md` records an earlier pre-T10 observation and a post-T10 human report that the requested two-page 320 × 640 browser visual/interaction check was verified. Screen-reader announcements, T08 dispatch approval, and deployed-provider compatibility remain open.

## Ordered verification and evidence

1. Add focused Student test coverage requested by earlier reviewers: detail-chat CSRF denial before ticket/reply reads, malformed JSON and 128 KiB body handling; create-route gateway error mappings; full Student draft/reply redaction capture at the fake-provider boundary. Preserve earlier failure evidence and report any newly failing suite.
2. Run the relevant Student UI, server API, feature, shared AI gateway, and accessibility-state tests with fake providers, plus the production build. Inspect test scripts first; store complete output in task-local logs. Do not run TA-specific tests or inspect TA files.
3. Conduct an independent adversarial review using synthetic Student ticket/draft/question/history/reply/model-output cases. Probe solution leakage, code/patch-shaped output, prompt injection, unauthorized context, and secret-shaped values through fake-provider tests or source reasoning. Record exact synthetic examples and remaining semantic limits without raw private data.
4. Reconcile A1–A9 in an implementation report and independent security/review report. Include the T10 messaging popup behavior and the recorded post-T10 human browser observation in combined verification. Leave screen-reader announcements and separately authorized deployed-model compatibility open until actually observed. Do not claim deployment readiness or merge approval from passing local tests.

## Proposed assignment boundary

- One T08 implementer: `/root/batch7_implementer`; a different independent reviewer: `/root/batch7_reviewer`. Because `.git` is read-only, use the existing shared-workspace separation exception and record the exact Student-only diff.
- Test allowlist: `src/codeclinic/test/student-help-chat.api.test.js`, `student-ticket-help.feature.test.js`, `StudentTicketHelpChat.test.tsx`, `StudentHelpChat.test.tsx`, and `ai-gateway.test.js` only for relevant Student/shared AI boundary assertions. No production source edit is preapproved in T08; a discovered defect returns to the orchestrator for a scoped correction and review.
- Evidence allowlist: `workflow/tasks/ai-error-explainer/implementation-T08.md`, `review-T08.md`, `security-review-T08.md`, corresponding factual logs and full outputs under `logs/tasks/ai-error-explainer/`, and final `implementation-report.md` owned by the orchestrator after reconciliation.
- Selected implementation skill: `openspec-apply-change` through the `workflow/specs/` adapter. No TA files/tests, provider/network/credential access, dependency, CI/deployment, public action, or external message is approved. `Overview.md` and `workflow/PLAN.md` reconciliation remains outside this batch.

## Human verification still required

At a **320 × 640 CSS-pixel viewport**, the human reported verifying the requested visual/interaction checklist after T10 on `/student/tickets/new` and an owned `/student/tickets/:ticketId`: messaging layout, header and composer, scrolling, overflow, focus, close/reopen, and refresh reset. `human-visual-verification.md` records the statement and its limits; no failure or screenshot was supplied. The human has not explicitly reported screen-reader speaker labels or status announcements, so that accessibility check remains open. Use synthetic content and avoid secrets for any follow-up; request a relevant screenshot only if a layout issue needs assessment.

A separate human authorization is required before any live provider/model compatibility smoke check involving credentials or external service access. Without it, T08 records deployment readiness as open.

**Approved decision:** dispatch Batch 7 T08 Student-only combined verification and independent review under this scope. Human visual observations and any later provider smoke authorization remain separate.
