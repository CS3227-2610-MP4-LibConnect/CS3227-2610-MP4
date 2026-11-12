# Batch 6 dispatch proposal: T10 messaging-style Student popup

Status: **APPROVED FOR BATCH 6 T10 DISPATCH** (2026-11-12). The human explicitly replied “approved” to this exact dispatch proposal in this conversation after batch plan v0.4 approval. Batch 7/T08, provider access, and merge remain separate gates.

Canonical specification, checklist, and handoff v0.6 were separately human-approved in this conversation. T01–T07 and T09 are checked complete after independent reviews. The prior unapproved Batch 6/T08 proposal and manifest are preserved as `batch-6-T08-v0.5-historical.md` and `assignment-batch-6-v0.5-historical.json`; T08 is now planned for Batch 7 after T10 review.

## Ordered work and acceptance

1. Change the existing shared Student popup to a messaging-app layout on `/student/tickets/new` and authorized owned `/student/tickets/:ticketId`: stable header with title, close, and clear-chat controls; left-aligned bot and right-aligned Student message bubbles; a scrollable conversation; and a bottom-anchored multiline composer with send action. Keep speaker identity in accessible text and do not rely on color alone.
2. Keep guidance about hints, wording suggestions on Create Ticket, unchanged ticket fields, secrets, bounded model history, and page-local clearing visible. Show pending and safe retry feedback without covering messages, controls, or focus. Keep the floating opener, viewport-constrained popup, underlying page usability, close/Escape focus return, mounted history, and plain-text rendering.
3. Preserve all request bodies, endpoints, create draft snapshots, detail ownership gating, server behavior, and no chat-triggered ticket/form write. Add or update focused Student UI tests for A1–A3/A8/A9, covering message order and identity, header/composer controls, pending/error states, focus, no reflow, and unchanged requests. Run the two focused Student UI suites and `npm run build`, capturing complete output in task-local logs.
4. A different reviewer independently inspects the exact T10 Student UI/test change, runs focused checks, records findings and remaining risks, and reports a separate T10 verdict before Batch 7/T08 dispatch.

## Proposed assignment boundary

- Implementer: `/root/batch6_messaging_implementer`; reviewer: `/root/batch6_messaging_reviewer`. `.git` is read-only, so use the shared-workspace separation exception. The reviewer must inspect the exact T10 source and tests alongside the prior T09 report; unrelated uncommitted work is outside this diff.
- Production allowlist: `src/codeclinic/src/tickets/StudentHelpChat.tsx` and `StudentHelpChat.css` only. A needed page integration edit returns to the orchestrator for an amended allowlist and human approval.
- Test allowlist: `src/codeclinic/test/StudentHelpChat.test.tsx` and `StudentTicketHelpChat.test.tsx` only.
- Evidence allowlist: `workflow/tasks/ai-error-explainer/implementation-T10.md`, `review-T10.md`, corresponding factual logs and full test/build output under `logs/tasks/ai-error-explainer/`, and `assignment-batch-6.json`. The orchestrator owns checklist and current-state updates after review.
- Selected implementation skill: `openspec-apply-change` through the repository `workflow/specs/` adapter. No second specification tree.
- No server, shared gateway, TA source/test, dependency, CI/deployment, provider, credential, network, external message, push, or merge action is in scope. Batch 7/T08 dispatch and human merge approval remain separate.

## Human visual criterion after implementation

At a **320 × 640 CSS-pixel viewport**, an active Student opens `/student/tickets/new`, then an owned `/student/tickets/:ticketId` after load. On each route, open the lower-right **Ticket help bot** and check header and bottom composer remain usable, bot and Student messages are on the intended sides, long text and history scroll, guidance and retry states remain visible, no horizontal overflow or ticket-content shift occurs, and the page remains usable. Check Tab/Shift+Tab focus visibility, Escape and close-button focus return, close/reopen retention, refresh clearing, and screen-reader speaker labels/status with synthetic content. Report observations; provide only a relevant 320-pixel screenshot if a layout issue needs assessment. This criterion stays open until the human reports it.

**Approved decision:** dispatch Batch 6 T10 Student-only implementation and independent review under the exact scope above. T08, live provider use, and merge retain separate approval gates.
