# Independent review — student-ticket-activity Batch 7

Date: 2026-11-10 (Asia/Singapore)
Reviewed: approved assignment/dispatch, spec v0.3, checklist v0.2, handoff v0.2, Batch 6 review and remediation proposal, Batch 7 T05/T06 reports and logs, current ticket detail implementation and UI tests, plus the reported full-suite/build/emulator evidence.

## Verdicts

- **T05 — pass with follow-up.** The failed/lost close outcome now locks the close action both in the button and in the handler. Failed status refresh keeps the lock. A successful refresh clears it, and the refreshed ticket state controls availability: active permits close; CLOSED remains disabled and RESOLVED has no close control. Focused tests independently passed 16/16. The actual rendered 320 CSS-pixel layout criterion remains unverified.
- **T06 — pass with follow-up.** Submitted evidence reports 43 suites / 798 tests passed, 4 opt-in suites / 4 tests skipped, production build success, and synthetic Firestore emulator 1/1 success. The real rendered 320px layout/overflow/visible-focus inspection remains open because the browser host was unavailable. The emulator did not validate Firestore Rules.
- **Combined Batch 7 — pass with follow-up.** The T05 remediation is consistent with T06's verification evidence; no combined behavior defect was found. Preserve the 320px visual check as open and do not mark the full T05/T06 checklist complete until that criterion is verified.

## Acceptance trace

| Item / criteria | Review result |
| --- | --- |
| T05, R4: prevent another close while outcome is unconfirmed | **Pass.** `closeTicket` returns when `needsCloseRefresh` is true, and the close button is disabled for that state. The lost-response test verifies the button is disabled and a second click leaves the close POST count at one. |
| T05, R4/F2: failed refresh retains lock; successful refresh reconciles state | **Pass.** Both the 409 and lost-response paths set the lock before refresh. On refresh failure they leave it set; the explicit refresh action clears it only on a successful detail read. Tests cover failed refresh after 409 and after lost response, successful active refresh restoring the action, and terminal state remaining disabled. |
| T05, R4: close conflict refresh / terminal state | **Pass.** A 409 refresh reports the current state; RESOLVED removes the close action. Confirmed CLOSED state is shown and its control disabled. |
| T05, R5: accessible feedback, keyboard use, literal text | **Pass in JSDOM.** Live status feedback and existing literal rendering remain; the focused suite includes keyboard traversal. Rendered visible focus is still part of the open browser check. |
| T05, 320 CSS-pixel layout | **Unverified.** No real browser render, overflow measurement, or screenshot was available. |
| T06, focused/full tests and build | **Evidence reviewed.** I independently reran the focused UI suite: 1 suite / 16 tests passed. Submitted full log reports 43/47 suites, 798 passed and 4 skipped; build log reports optimized build compiled successfully. |
| T06, emulator integration | **Evidence reviewed.** Submitted final emulator evidence reports 1 suite / 1 test passed for query, ownership, paging, writes, and close race. The emulator warned no rules file was configured and defaulted to allow, so this verifies application behavior only, not Rules. |
| T06, browser layout/accessibility | **Unverified.** The implementation log records an empty CUA inventory and unavailable browser host. No rendered inspection is claimed. |
| Combined scope and security | **No new issue found.** Batch 7 assignment restricts implementation to the detail page and its UI tests for T05, plus evidence for T06. The current T05 changes are localized to the close-state UI logic/tests; server authorization/state enforcement is unchanged from previously reviewed work. No live access or consequential operation was used. |

## Findings

No production correction is required from this review. The remaining follow-up is the already documented rendered 320 CSS-pixel inspection, including horizontal overflow and visible focus. This is a verification gap, not evidence of a layout failure.

## Unverified criteria and limits

- The actual rendered page at 320 CSS pixels, horizontal overflow, and rendered visible focus could not be verified because the browser access host was unavailable (`apps=[]`, `browsers=[]`). Keep this criterion open.
- Emulator testing used synthetic local data and no Firestore rules file; it is not security-rules validation.
- The shared workspace contains uncommitted task work. The Batch 7 assignment explicitly records the shared-workspace separation exception. The current source/tests and batch-specific reports were reviewed; this review made no production, checklist, assignment, or manifest changes.

Execution details: [`review-batch-7.md`](../../../logs/tasks/student-ticket-activity/review-batch-7.md).
