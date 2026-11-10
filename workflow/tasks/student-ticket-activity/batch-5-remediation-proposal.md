# Batch 5 review reconciliation and remediation proposal

Date: 2026-11-10 (Asia/Singapore)
Source: independent [`Batch 5 review`](review-report-batch-5.md) against specification v0.3, checklist v0.2, and handoff v0.2.

The completed Batch 5 assignment passed structural `complete` validation. T05 remains unchecked because the detail page links directly to an untrusted stored repository URL and its generic close-failure message asserts an unconfirmed state. T06 remains unchecked because the required rendered 320 CSS-pixel inspection was unavailable. The focused UI/routes review passed 42 tests; the synthetic emulator rerun passed 1 test. The implementation full suite passed 43 suites/795 tests and the production build passed. These results do not resolve the two findings or the viewport gap.

## Proposed next batch

| Order | Item | Scoped work and evidence |
| --- | --- | --- |
| 1 | T05 remediation | Render stored repository reference as plain text, with no untrusted navigation target; replace generic failed-close text with unconfirmed-status feedback and a refresh path. Add focused hostile-URL and lost-response tests. Rerun focused UI tests; independent reviewer checks both findings and combined behavior. |
| 2 | T06 completion | Run the full suite/build as needed after the fix and inspect the rendered ticket and dashboard at 320 CSS pixels using an available browser surface, including keyboard access and horizontal overflow. Record actual viewport evidence and independent review. If no browser surface is available, retain T06 as incomplete and report the limit. |

This is a proposed Batch 6 (T05 then T06) under the existing spec/checklist/handoff. It needs a separate human review decision and dispatch approval before implementation. The proposal does not authorize a commit, merge, push, live index deployment, or publication.
