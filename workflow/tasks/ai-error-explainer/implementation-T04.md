# T04 implementation report

Status: **complete; ready for independent review**

Contract: approved `workflow/specs/ai-error-explainer.md` v0.4, checklist v0.3, handoff v0.3. Batch 3 dispatch was explicitly approved by the human. The OpenSpec apply preflight used the repository `workflow/specs/` adapter; the native CLI reported no change tree, as documented in the task handoff. The Batch 3 plan validator passed before implementation.

## Result

Added the Student-owned detail help-chat POST route. It authenticates and checks CSRF before ticket reads, rejects create-only/unknown request fields, validates bounded question/history, rereads the owned ticket for every deterministic 50-reply page, filters replies by the owner and the current assigned TA, and sends only allowed ticket problem fields and eligible reply text through the existing gateway. After each page, the route redacts the complete serialized candidate context. It stops further paging only when that redacted prefix exceeds the approved cap by 2,048 code units, leaving headroom for a bounded redaction pattern completed at the next page boundary. Once paging ends, it performs an exact redacted full-context cap check before calling the gateway. If assignment changes during a multi-page scan, it returns a safe unavailable response without provider use; the next request re-reads the new assignment. Identity, assignment and reply identifiers are excluded from provider context. Safe error envelopes remain no-store. The route makes no ticket or reply writes. The inactive-account API expectation now matches approved v0.4 (401).

## Files

- `src/codeclinic/server/tickets/student-help-chat.js`
- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/test/student-help-chat.api.test.js`
- `workflow/tasks/ai-error-explainer/implementation-T04.md`
- `logs/tasks/ai-error-explainer/implementation-T04-run.txt` (complete command output)

No store change was needed; the existing `getOwned` API supplies ordered pages of 50 replies.

## Verification

Command: `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-help-chat.api.test.js test/student-ticket-help.feature.test.js` from `src/codeclinic`.

Result: **2 suites passed, 78 tests passed**. This includes the six previously failing detail-route scenarios, now passing under v0.4's inactive-session 401 contract, plus pagination beyond 50 replies, author filtering, reassignment on a subsequent request, unknown/create-only input rejection, safe storage failure, early cap overflow without a second page or provider call, and safe handling of reassignment during a scan. The complete output is in the linked log.

## Criteria and risks

A3–A7 route behavior is implemented and the focused automated route/feature checks pass. The 2,048-code-unit boundary margin is a conservative guard above the longest bounded match in the shared redactor; open-ended private-key and assignment patterns already collapse the available prefix to one marker during each scan. The exact complete context is checked before gateway invocation, and the gateway repeats redaction/cap enforcement before transport. Independent review should assess this margin and early-stop reasoning. Manual adversarial review and deployed-model compatibility remain open for T08. No provider or network was accessed. No TA file or test was read or changed.
