# T09 implementation handoff

Status: **implementation complete; independent review pending**. Canonical specification `workflow/specs/ai-error-explainer.md` v0.5 and checklist/handoff v0.5. Batch 5 dispatch was human-approved in `batch-5-popup-dispatch-proposal.md`. The repository `workflow/README.md` adapter supplies the OpenSpec apply preflight; no second specification tree was created. Selected skill: `openspec-apply-change`.

## Change and acceptance

- `StudentHelpChat.tsx` and `.css`: added a fixed lower-right opener and viewport-constrained popup, an in-panel close button, Escape handling, and focus return to the opener. The chat remains mounted while hidden, preserving page-local turns and pending requests. The conversation scrolls within the popup, with a fallback panel scroll on short viewports. Existing request, safe error, plain-text rendering, and clear-chat logic are unchanged.
- `TicketCreatePage.tsx` and `TicketDetailPage.tsx`: mount the shared popup outside the ticket/form card. The create draft snapshot remains built at send time. The detail popup appears only after the authorized ticket load and retains its ticket-ID key for reset. Removed unused inline-chat selectors from their `.css` files.
- `StudentHelpChat.test.tsx` and `StudentTicketHelpChat.test.tsx`: cover popup visibility, Escape and close-button focus return, placement outside each card, and existing request, history, error, and ticket-write boundaries.

Automated A1–A3/A8/A9 Student UI checks pass. CSS uses fixed positioning, so opening or closing does not alter card flow. The **human browser visual criterion is open**: placement, overflow, scrolling, page usability, and unobscured focus at 320 × 640 CSS pixels need observation on both routes. Automated DOM and build checks cannot establish that visual result. T08, provider compatibility, and merge are outside this implementation dispatch.

## Verification and risks

- Focused Student UI tests: 2 suites, 13 tests passed; full output in `logs/tasks/ai-error-explainer/implementation-T09-test.txt`.
- Production build: compiled successfully; full output in `logs/tasks/ai-error-explainer/implementation-T09-build.txt`.
- Commands and results: `logs/tasks/ai-error-explainer/implementation-T09.md`.
- No dependencies, server routes, TA code, deployment configuration, or external services changed. No known implementation blocker. Human visual check and independent review remain open.
