# Independent review: Batch 3 T04/T05

Date: 2026-11-11  
Reviewed contract: specification v0.4, checklist v0.3, handoff v0.3; approved Batch 3 proposal and manifest.  
Scope: exact Student-side T04/T05 implementation and combined interaction. No TA-specific files or tests were inspected or run. No production code or checklist was changed.

## Verdicts

- **T04 — pass with follow-up.** The owned-ticket route authenticates and checks CSRF before ticket reads, uses the trusted owner ID for `getOwned`, validates the exact detail body, scans deterministic 50-reply pages, filters context to owner/current-assigned-TA text, excludes IDs and unrelated ticket properties, fails closed on assignment changes between pages, and performs a complete redacted cap check before gateway use. It does not write tickets or replies. API and feature suites passed. Add a detail-specific CSRF rejection/no-ticket-read assertion and detail-path malformed JSON/oversized body assertions when extending route coverage; current code uses the shared route-local parser/error middleware, and malformed shape/storage/cap behavior is covered.
- **T05 — pass with follow-up.** The shared component confines history to React state, submits at most eight prior turns through its supplied endpoint, gets CSRF through the existing endpoint, renders content as React text, retains failed questions, blocks duplicate sends while pending, clears visible history, and provides labeled controls, status/error announcements, wrapping, and visible keyboard focus CSS. Component tests passed and the production build compiled. The 320 CSS-pixel browser layout and screen-reader/browser behavior still require the human check specified by `AGENTS.md` and T08; jsdom and the build do not establish those outcomes.
- **Combined T04/T05 — pass with follow-up.** Component request shape and endpoint contract match the detail route (`{ question, history? }` and `{ reply }` success envelope). Remaining T06/T07 page integration and the human browser check are outside this batch.

## Acceptance trace

### T04

| Criterion | Evidence and result |
| --- | --- |
| Trusted auth, active Student, CSRF, ownership before reply access | `student-help-chat.js:95-118`; `store.js` `getOwned` checks stored owner before querying replies. API tests cover visitor, TA, inactive/password-change account, non-owner, and malformed detail body; the direct CSRF failure assertion currently covers create chat only. Pass with coverage follow-up below. |
| Fresh detail context, ordered bounded paging beyond first 50 | `student-help-chat.js:110-141`; `store.js:44-72` orders by `createdAt`, then `replyId`, with `REPLY_PAGE_SIZE = 50`. API test covers 51 replies and cursor continuation. Pass. |
| Owner/current-assigned-TA only; no private IDs/context | `student-help-chat.js:115-155` allowlists ticket problem fields and maps eligible replies to `{ message }`. API test checks old TA exclusion, current TA inclusion, owner reply inclusion, and absence of reply/ticket/account IDs from gateway input. Pass. |
| Reassignment behavior | `student-help-chat.js:120-125` fails safely if assignment changes mid-scan; each new request begins with a fresh `getOwned` read. API tests cover both cases. Pass. |
| Complete redacted cap, no truncation, no provider on overflow | Each page is serialized and redacted before threshold comparison (`:126-141`); the final complete serialization is redacted and capped before gateway invocation (`:145-152`). The 2,048-code-unit early-stop margin exceeds bounded cross-boundary match lengths; open-ended private-key matches already redact the current suffix and do not make the completed redaction shorter than that prefix. Final complete-context check is authoritative. Cap and no-provider overflow tests pass. Pass. |
| No writes and safe envelopes | Route only calls read-only `getOwned` and `gateway.run`; success/error responses use the `{ reply }` / `{ error: { code } }` envelopes and `no-store`. Storage, overflow, malformed input, and gateway failure coverage passed. Pass. |
| A3–A7 | Detail behavior and safe failure scenarios covered by API and fake-gateway feature suites. Manual adversarial review and provider compatibility remain assigned to T08 and are not claimed here. |

T04 automated-coverage follow-up: the detail route's CSRF check is visible at `student-help-chat.js:102`, but tests do not currently assert the detail-specific CSRF failure before `getOwned`. Raw malformed-JSON and oversized HTTP-body assertions use the create path; detail has malformed shape and safe context-overflow coverage, and both paths use the same route-local parser/error middleware. The code review found no implementation defect; add these direct detail-path assertions when expanding coverage.

### T05

| Criterion | Evidence and result |
| --- | --- |
| Page-local bounded history and clear | `StudentHelpChat.tsx:37-40, 59, 68, 79`; no browser storage calls. Tests cover unmount/remount reset, no storage writes, bounded eight-turn history, and clear. Pass. |
| Retry, pending, and safe errors | `StudentHelpChat.tsx:44-77, 92-99`; tests cover failed question/history retention, fixed local error message, retry, and duplicate-send prevention/status. Pass. |
| Plain-text rendering | `StudentHelpChat.tsx:84-89` renders strings as React text; test injects HTML-looking text and confirms it remains a paragraph string. Pass. |
| Accessibility and responsive CSS | Labeled textarea/buttons, `role="log"`, `role="status"`, `role="alert"`, and focus-visible rules are present. CSS wraps long message text and allows action wrapping. Component tests cover accessible names/status/pending state. Actual 320px overflow, visible focus in a browser, and screen-reader behavior remain unverified pending human visual/browser check. Follow-up. |
| Create/detail host support | Component receives `endpoint` and optional `introduction`; tests exercise create and detail paths via the component/public-contract test files. Route contract is compatible. Actual page integration is T06/T07. Pass for component contract. |

## Findings and risks

- **Low — human verification pending:** T05/A9 browser layout, visible focus, and screen-reader confirmation at 320 CSS pixels have not been performed. Complete the exact human check required by `AGENTS.md` on both `/student/tickets/new` and an owned `/student/tickets/:ticketId` page before closing T08; record viewport, interaction, overflow/focus observations, and screenshots if needed.
- **Low — direct route-test coverage:** add detail-specific CSRF and malformed/oversized-body assertions as described above. The implementation path is present and common parser/error behavior has related create-route coverage.
- **No implementation defect found** in the requested 2,048-code-unit T04 margin. The incremental redaction is not used as final authorization to call the gateway: the route performs an exact complete-context redaction/cap check after paging and before the call.
- The pre-existing test-writer file `src/codeclinic/test/StudentTicketHelpChat.test.tsx` is outside the T04/T05 manifest allowlist and reserved for T06/T07; it was not run as part of this review. No TA tests were inspected or run.

## Verification

Exact commands, working directory, and results are in [`review-T04-T05.md` execution log](../../../logs/tasks/ai-error-explainer/review-T04-T05.md). Focused Student tests: 3 suites, 82 tests passed. Production build: compiled successfully. No network/provider/credential access occurred.

Unverified for this review: visual/browser and screen-reader behavior; manual adversarial review; deployed-model compatibility smoke check. These remain explicit later requirements and are not claimed passed.
