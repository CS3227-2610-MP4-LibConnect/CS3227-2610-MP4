# Batch 6 review reconciliation and remediation proposal

Date: 2026-11-10 (Asia/Singapore)
Source: independent [`Batch 6 review`](review-report-batch-6.md) against specification v0.3, checklist v0.2, and handoff v0.2.

The completed Batch 6 assignment passed structural `complete` validation.
Batch 5 findings F1 and the main F2 are fixed: the stored repository reference
is plain text, and a failed close gives unconfirmed feedback with a status
refresh. T05 remains unchecked because the close button remains enabled while
that refresh is required. T06 remains unchecked because the required rendered
320 CSS-pixel layout and overflow inspection could not run: the CUA browser
host was unavailable. The focused UI suite passed 14/14, full suite 43
suites/796 tests, production build, and local synthetic emulator test 1/1.

## Proposed next batch

| Order | Item | Scoped work and evidence |
| --- | --- | --- |
| 1 | T05 remediation | Disable `Close Ticket` while close status is unconfirmed. Keep it disabled after a failed refresh; clear that lock only after a successful refresh. Test lost response, failed refresh, active refresh, and terminal refresh. Independently review T05 and combined behavior. |
| 2 | T06 completion | Rerun relevant checks after the UI change and inspect the rendered ticket and dashboard at 320 CSS pixels, including visible focus and horizontal overflow, when a browser surface is available. If unavailable, retain T06 as incomplete and record the exact gap. |

This proposes Batch 7 (T05 then T06) under the existing approved spec,
checklist, and handoff. It needs a human review decision and separate plan and
dispatch approval before implementation. No live index deployment, commit,
merge, push, or publication is included.
