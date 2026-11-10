# Proposed Batch 2 T03 correction

Date: 2026-11-10 (Asia/Singapore)
Status: awaiting human decision under the review finding gate.

The independent review reproduced two initial **Retry** requests from two clicks dispatched before React commits the loading state. The approved R2 requirement says repeated clicks while a request is pending must not duplicate a request. T03 remains unchecked; T04 is also unchecked because human 320 CSS-pixel rendered verification is pending.

Proposed correction within existing approved T03 scope:

1. Add a synchronous in-flight guard to the initial-page request/retry path in `src/codeclinic/src/tickets/MyTicketsPage.tsx`. Keep view-switch generation handling intact so a new view can load while an old request is ignored.
2. Add a regression test in `src/codeclinic/test/StudentMyTickets.test.tsx` that dispatches repeated initial Retry clicks before a render commit and asserts only one additional list request. Preserve the review-only failed test and prior logs as evidence.
3. Run the Student-focused UI/API suites and production build as relevant. Return the correction to the independent reviewer for a focused re-review in the separate checkout. Leave the human rendered criterion open until the human reports their observation.

No TA feature or suite change, live Firestore access, index deployment, dependency change, commit, or merge is proposed. This correction does not change the approved specification or checklist wording.
