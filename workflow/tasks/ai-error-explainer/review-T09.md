# Independent review: Batch 5 T09

**Verdict: pass with follow-up** for T09 and the combined Batch 5 change (singleton T09). Reviewed canonical specification v0.5, checklist/handoff v0.5, and the human-approved Batch 5 dispatch. The reviewer is different from the implementer. Shared-workspace review follows the manifest's read-only `.git` exception. T08 dispatch and merge remain separate decisions.

## Scope and traceability

Inspected the eight Student UI/test files in `assignment-batch-5.json`'s implementer allowlist, the T09 implementation report, the page source diff against HEAD, the component and style contents, the route guard, and the relevant existing page styles. The working tree also contains prior Batch 2–4 work, so HEAD is not a clean T09 baseline. No server, TA, provider, dependency, CI, or deployment file was reviewed or changed for this item. No review-only tests were added.

| Criterion | Evidence and result |
| --- | --- |
| A1–A3: create and owned-detail chat with existing request boundaries | `TicketCreatePage.tsx` mounts the component outside the form card and builds the full draft at send time; `TicketDetailPage.tsx` mounts it outside the detail card only for a loaded ticket whose ID matches the route, retaining the ticket-ID key. Focused tests verify the create draft, unchanged fields, detail endpoint without a draft, and no chat-triggered ticket submission. Pass for T09 scope. |
| A8: page-only conversation and ticket reset | The panel uses `hidden` while the component remains mounted. Tests verify close/reopen retention, no browser-storage write, unmount clearing, and a detail ticket-ID change clearing visible turns. Pass. |
| A9: popup placement, interaction, and accessibility state | `StudentHelpChat.css` fixes the opener and panel to the viewport, constrains width and height, scrolls the conversation and panel, and defines focus-visible outlines. `StudentHelpChat.tsx` provides `aria-expanded`, a controlled hidden panel, Escape and close-button focus return. Focused tests verify DOM placement outside cards, hidden state, and focus return. Automated part passes. The real-browser 320 × 640 CSS-pixel visual and screen-reader criterion is unverified. |
| Safety and regression | Replies are rendered as React text; the existing CSRF and endpoint requests, bounded history, safe errors, retry state, and pending guard remain in the component. Tests verify plain-text rendering, errors, duplicate prevention, and no form-field mutation. No chat-triggered ticket/reply write was found. Pass for the reviewed client boundary. |

## Findings and open criteria

- **Follow-up, visual verification — A9 / `StudentHelpChat.css`:** Fixed positioning and viewport calculations support the layout, but JSDOM does not measure the rendered 320-pixel layout. A human must check `/student/tickets/new` and an owned `/student/tickets/:ticketId` at **320 × 640 CSS pixels**: button and popup placement, no ticket-content shift or horizontal overflow, long-conversation scrolling, page usability, visible and unobscured Tab/Shift+Tab focus, Escape and close-button focus return, close/reopen retention, refresh clearing, and screen-reader labels/status. Record observations and a relevant screenshot only if needed to assess a problem. Do not mark A9's visual criterion passed yet.
- **Existing downstream work — T08:** Combined Student/server and AI-boundary verification, manual adversarial review, and separately authorized deployed-provider compatibility are outside this batch and remain open. This review does not establish deployment readiness.

No blocking T09 defect or unapproved scope change was found. The automated evidence supports continuing to the separately approved T08 gate after orchestrator reconciliation. Full command results are in [the review log](../../../logs/tasks/ai-error-explainer/review-T09.md), with complete [test](../../../logs/tasks/ai-error-explainer/review-T09-test.txt) and [build](../../../logs/tasks/ai-error-explainer/review-T09-build.txt) output.
