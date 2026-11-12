# Batch 4 dispatch proposal: T06 and T07

Status: **APPROVED FOR BATCH 4 DISPATCH** (2026-11-11). The human explicitly replied “approved” to this proposal in the conversation.

Specification v0.4, checklist v0.3, and handoff v0.3 are human-approved. T01–T05 are checked complete. Batch 3 T04/T05 passed separate and combined independent review with follow-up; `assignment-batch-3.json` passed its complete validator before checklist reconciliation. Its focused Student verification passed 3 suites/82 tests and `npm run build` compiled. The approved batch plan v0.2 orders T06/T07 as Batch 4, but its dispatch still needs this separate approval.

## Ordered work

1. **T06 — Create-page integration and refinement.** Put a labeled open/close chat control only on the Student create-ticket page. Opening locally shows “What help do you need?” without a provider call. Send a complete, fresh snapshot of every current draft field with each question; the shared component may need a typed request-body callback invoked at send time for this. Show field-specific refinement suggestions only as chat text. Never edit the form, submit a ticket, or write a transcript through chat. Verify A1/A2/A6/A8/A9 with focused Student UI tests, including second-turn edits, incomplete drafts, failure retention, and no form mutation.
2. **T07 — Detail-page integration.** Show the chat control only after a successful authorized owned-ticket load and use the detail HTTP endpoint with question and bounded history only. Ensure a ticket-ID change clears prior chat state; keep chat page-local and hint-only. Verify A3/A4/A8/A9 with focused Student detail UI tests, including absent chat for unavailable/non-owned tickets and no draft/body mutation. Finish T06 verification before T07 begins.

## Proposed assignment boundary

- One implementer: `/root/batch4_implementer`; one different independent reviewer: `/root/batch4_reviewer`. `.git` is read-only, so record the shared-workspace separation exception and review the exact uncommitted Student diff.
- Source allowlist: `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `TicketCreatePage.css`, `TicketDetailPage.tsx`, `TicketDetailPage.css`, `StudentHelpChat.tsx`, and `StudentHelpChat.css` only as needed for the approved integrations and fresh draft snapshot interface. No server, shared gateway, TA, account, or unrelated page changes.
- Test allowlist: `src/codeclinic/test/StudentTicketHelpChat.test.tsx` (reconcile the pre-implementation direct-response mocks to the approved `{ reply }` HTTP envelope and extend page integration assertions), and `src/codeclinic/test/StudentHelpChat.test.tsx` only if the shared component interface changes. No TA-specific tests.
- Reports and logs: `workflow/tasks/ai-error-explainer/implementation-T06.md`, `implementation-T07.md`, and matching paths under `logs/tasks/ai-error-explainer/`; independent `review-T06-T07.md` and matching log.
- Checks: focused Student create/detail UI and component tests, the relevant Student server/feature contract tests if a request-shape regression is suspected, and `npm run build`. Capture complete failures in task-local logs. Use fake HTTP/provider fixtures only; no live provider, credentials, network, new dependency, CI/deployment change, or persistence.

## Existing follow-ups and next gate

Batch 3's reviewer requested direct detail-path CSRF, malformed JSON, and oversized-body assertions. T08 retains those coverage follow-ups, Student-specific redaction capture, create-route gateway error mappings, manual adversarial review, the human 320 CSS-pixel browser/screen-reader check on both pages, and a separately authorized deployed-model compatibility smoke check. Batch 4 approval grants only T06/T07 implementation and independent review. T08 and merge/deployment decisions remain separate.

**Approved decision:** dispatch Batch 4 T06/T07 under this exact Student-only scope and current approved artifacts.
