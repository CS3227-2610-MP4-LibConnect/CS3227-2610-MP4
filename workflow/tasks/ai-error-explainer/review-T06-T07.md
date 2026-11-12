# Independent review: Batch 4 T06/T07

Status: **pass with follow-up** for T06, T07, and the combined Student UI change.

## Review basis

- Specification: `workflow/specs/ai-error-explainer.md` v0.4, approved.
- Checklist: `workflow/tasks/ai-error-explainer/tasks.md` v0.3, approved; T06 and T07 remain open pending orchestrator reconciliation.
- Handoff: `workflow/tasks/ai-error-explainer/handoff.md` v0.3, approved.
- Dispatch: `batch-4-dispatch-proposal.md`, approved; `assignment-batch-4.json` assigns this independent review and records the shared-workspace separation exception.
- Implementer evidence: `implementation-T06.md`, `implementation-T07.md`, and their linked factual logs.
- Reviewed Batch 4 implementation files: `TicketCreatePage.tsx`, `TicketCreatePage.css`, `TicketDetailPage.tsx`, `TicketDetailPage.css`, `StudentHelpChat.tsx`, `StudentHelpChat.css`, `StudentTicketHelpChat.test.tsx`, and `StudentHelpChat.test.tsx` under `src/codeclinic/`.

The review was limited to the assigned Student UI diff. TA files and tests were excluded. No production code, checklist, or tests were changed by this reviewer.

## T06 — Create-page integration

**Verdict: pass with follow-up.**

| Criterion | Evidence and result |
| --- | --- |
| A1: local opener, no provider request | `TicketCreatePage.tsx` mounts `StudentHelpChat` under a hidden wrapper and supplies the exact local introduction. The UI test opens it and asserts no fetch; the shared component makes no request on mount. Pass. |
| A2: complete fresh draft, chat-only refinement, no form mutation/write | `buildHelpRequest` copies every draft field, including blank values, raw tags/paths, and file names/content. The component calls the builder synchronously before its first `await`; a deferred-CSRF test edits the form while pending and confirms the submitted snapshot stays as it was at send time. The integration test checks a later turn sees the new title, refinement remains chat text, form values remain unchanged, and no ticket POST occurs. Pass. |
| A6: untrusted text stays non-executable and chat cannot apply a suggestion | `StudentHelpChat` renders response text through React text nodes; the component test passes HTML-looking content and verifies it remains a paragraph's literal text. No apply/autofill path exists. This checks the UI boundary; semantic solution-leakage review remains assigned to T08. Pass with follow-up. |
| A8: page-local state, reopen retention, no persistence | The create wrapper uses `hidden`, so closing/reopening preserves the mounted component state. Tests cover reopening, unmount reset, storage not being written, and the component's bounded history. Pass. |
| A9: keyboard/accessibility/responsive layout | Labels, button names, `aria-expanded`, a live log, status, and visible focus styles are present; automated UI assertions cover focus and announced status. The required 320 CSS-pixel browser and screen-reader check has not been performed. Follow-up remains open. |

The opening prompt appears in the hidden DOM before opening, but is not exposed while the wrapper has the native `hidden` attribute. Opening makes it visible without a fetch.

## T07 — Detail-page integration

**Verdict: pass with follow-up.**

| Criterion | Evidence and result |
| --- | --- |
| A3: owned ticket loaded before chat, detail route, hints only | The page renders ticket content and chat only when `ticket?.ticketId === ticketId`; pending route changes render the loading state, and failed loads render no control. The component targets the encoded detail endpoint. Its request builder sends only `question` and bounded `history`; no draft or ticket data is included. The UI test asserts the exact body and endpoint. Pass. |
| A4: unavailable/non-owned load exposes no chat | The detail page test returns the detail API's 404 response, checks no help control is rendered, and confirms no extra request. Server authorization is outside this UI review. Pass for the assigned UI behavior. |
| A8: page-local state and ID-change reset | The component is keyed by `ticketId`, and a route-ID mismatch hides/unmounts the old ticket page while loading the new one. The test sends a first-turn message, changes the ID, and confirms the prior question and reply are absent after the new ticket loads. Shared component tests cover no storage writes. Pass. |
| A9: keyboard/accessibility/responsive layout | The same labeled controls, live regions, and focus treatment are present through the shared component. Automated state checks pass; the required human browser and screen-reader check at 320 CSS pixels remains open. Follow-up remains open. |

## Combined review and findings

**Combined verdict: pass with follow-up.** The create and detail integrations use the shared page-local component consistently. Create sends a complete send-time snapshot; detail sends only question/history. Neither page has a provider call, persistence path, form mutation, ticket submit, or suggestion application path. The focused tests and production build pass.

No implementation defect requiring a code correction was found in the assigned Student UI diff. No unapproved Batch 4 source files were identified in the reviewed UI changes.

| Severity | Finding | Required action |
| --- | --- | --- |
| Follow-up | A9 is not fully verified: no human visual and screen-reader evidence at 320 CSS pixels is recorded. | T08/human: check `/student/tickets/new` and an owned `/student/tickets/:ticketId` at a 320 CSS-pixel viewport; exercise keyboard focus and screen-reader announcements; confirm no horizontal overflow or obscured focus. Record observations and screenshots if needed. |
| Follow-up | A6's semantic resistance to solution leakage remains a T08 adversarial-review item; the UI review only confirms literal text rendering and absence of apply/write behavior. | Complete the separately assigned manual adversarial review under T08. |

The implementation log records an earlier selector failure in an exploratory detail test followed by a selector correction and passing rerun. My independent focused run passed; the earlier failure is retained and does not reproduce.

## Verification

See [`logs/tasks/ai-error-explainer/review-T06-T07.md`](../../../logs/tasks/ai-error-explainer/review-T06-T07.md) for exact commands and results. Independent focused Student tests passed 2 suites/12 tests; `npm run build` compiled successfully. No provider, credential, or network access was used. No TA files or tests were examined or run.

## Criteria not verified by this review

- Human browser visual and screen-reader behavior at 320 CSS pixels (A9).
- T08 manual adversarial review for semantic solution leakage and secret handling beyond automated literal rendering checks (A6).
- Server endpoint authorization and provider-boundary behavior; those belong to earlier item reviews and T08 combined verification, not this UI assignment.
