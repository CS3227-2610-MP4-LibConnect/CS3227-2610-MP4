# Implementation T06: Draft button on the ticket page

Spec: `workflow/specs/ai-ta-assist.md` v0.2; checklist v0.2; handoff v0.2 (all human-approved 2026-11-09). Base `f88ddf6`, branch `ai-ta-assist-t06`.

Changed files: `src/codeclinic/src/TATicketPage.tsx`, `src/codeclinic/src/TATicketPage.css`.

Behaviour:
- "Draft with AI" sits in the resolve form (claimer of a CLAIMED ticket only; the server enforces this too).
- It posts with no body and the CSRF token to `.../fix-note-draft`. While pending the button is disabled and "Drafting…" shows.
- On success the draft is set only as the text area value (plain text) and "AI draft. Review and edit before resolving." shows. It never submits or opens the confirm step.
- If the text area has text, `window.confirm` asks after the reply arrives; declining keeps the text and shows no AI note.
- 503/429/422/502 show the fixed R5 messages inline (server text ignored); other failures show a generic inline message. 409 refetches and shows the existing stale notice. The text area is untouched on errors.
- The block is labelled "AI suggestion". No innerHTML, no AI text as links.

Verification (from `src/codeclinic`):
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false TATicketPage ta-ticket-queue.review`: 4 suites, 71 tests passed.
- `npx tsc --noEmit -p .`: no errors.

Risks: replace prompt uses `window.confirm` (spec leaves the mechanism open). Not verified against T04's real endpoint. Layout at 320 px checked by CSS rules only (flex-wrap, min-width 0), not in a browser.
