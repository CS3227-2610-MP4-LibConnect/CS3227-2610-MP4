# Batch 5 dispatch proposal: T09 Student side popup

Status: **APPROVED FOR BATCH PLAN v0.3 AND BATCH 5 T09 DISPATCH** (2026-11-11). The human explicitly replied “approved” to this proposal in this conversation.

The human approved canonical specification v0.5, then separately approved checklist and handoff v0.4 and their numeric task-ID correction v0.5. T01–T07 are complete after independent review. Batch plan v0.3 is proposed; Batch 5 is a singleton T09 correction before T08 because the new popup and focus behavior need their own implementation evidence and independent review. The earlier `batch-5-dispatch-proposal.md` for T08 was pending, never approved, and is superseded.

## Ordered work and acceptance

1. Put the **Ticket help bot** control at the lower right of the viewport on `/student/tickets/new` and an authorized `/student/tickets/:ticketId` only. Opening shows a compact side popup anchored above the control, outside the page content flow, without shifting the ticket form or details. Keep the page usable while the popup is open.
2. Constrain width and height to the viewport, including 320 CSS pixels; scroll the conversation within the popup. Keep close, question, send, and clear controls reachable with visible focus. Close by button or Escape and return focus to the opener. Keep the mounted chat hidden on close so local history persists until refresh/navigation; changing ticket ID still resets detail chat.
3. Preserve the create-page fresh all-fields snapshot, detail-page authorized-load gate and endpoint, plain-text replies, pending/error behavior, and no chat-triggered form or ticket write. Add or update focused Student UI tests for A1–A3/A8/A9, including open/close focus, Escape, history retention, authorized-page scope, no form mutation, and no regression to request bodies. Run focused Student UI/component tests and `npm run build`, recording complete output in task-local logs.
4. A different reviewer independently checks the exact T09 diff, runs focused checks, records findings and remaining risks, and reports a separate T09 verdict before T08 is dispatched.

## Proposed assignment boundary

- Implementer: `/root/batch5_popup_implementer`; reviewer: `/root/batch5_popup_reviewer`. `.git` is read-only, so use the shared-workspace separation exception and have the reviewer inspect the exact uncommitted Student-only diff.
- Production allowlist: `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `TicketCreatePage.css`, `TicketDetailPage.tsx`, `TicketDetailPage.css`, `StudentHelpChat.tsx`, and `StudentHelpChat.css`.
- Test allowlist: `src/codeclinic/test/StudentTicketHelpChat.test.tsx` and `StudentHelpChat.test.tsx`.
- Evidence allowlist: `workflow/tasks/ai-error-explainer/implementation-T09.md`, `review-T09.md`, their factual logs and full test/build output under `logs/tasks/ai-error-explainer/`, and `assignment-batch-5.json`. The orchestrator owns the checklist and current-state index after review.
- Selected implementation skill: `openspec-apply-change` using the repository's `workflow/specs/` path adapter and approved task artifacts. No second specification tree.
- No server, shared gateway, TA source/test, dependency, CI/deployment, provider, credential, network, external message, push, or merge action is in scope. T08 and human merge approval remain separate.

## Human visual criterion after implementation

At a **320 × 640 CSS-pixel viewport**, an active Student opens `/student/tickets/new`, then an owned `/student/tickets/:ticketId` after load. On each route, check that the lower-right button opens a compact side popup without moving ticket content, the popup and long chat text fit without horizontal overflow, the page remains usable, and Tab/Shift+Tab focus is visible and unobscured. Check Escape and the close button return focus to the opener; close/reopen retains conversation and refresh clears it. Check screen-reader labels and status announcements with synthetic content. Report observations, and provide only a relevant 320-pixel screenshot if a layout issue needs assessment. The agent must leave this criterion open until the human reports it.

**Approved decision:** dispatch Batch 5 T09 under this exact Student UI scope. This authorizes implementation and independent review of this batch. T08, a provider smoke check, and merge retain separate approval gates.
