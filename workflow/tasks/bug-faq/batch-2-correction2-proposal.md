# Bug FAQ Batch 2 T03 follow-up correction proposal

Date: 2026-11-13. Approval state: human approved in conversation on 2026-11-13 for the CSS-only correction.

## Human-confirmed finding

After correction revision 1, the human reported that the **Search field** text remains misaligned at `/student/dashboard` with a 320 CSS px viewport. The supplied screenshot is preserved at `logs/tasks/bug-faq/visual/faq-mobile-search-field-misaligned-2026-11-13.png`, with the report in `human-visual-verification.md`. The independent T03 correction review measured the label at the right edge while the selector begins on the left and identified CSS selector specificity as the cause. T03 was reopened; T04 remains open.

## Exact proposed change

In `src/codeclinic/src/tickets/StudentBugFaq.css` only, override the more specific desktop `label:nth-of-type(2)` grid-column rule within the mobile media query so the **Search field** label occupies column 1 directly above its selector. Preserve the distinct sequential rows, desktop layout, and visible focus styles. No product requirement, data model, API, documentation, dependency, or deployment change is proposed.

The implementer will record a T03 correction report/log. A separate reviewer will inspect the exact CSS change and combined T03/T04 behavior from a fresh isolated snapshot. Both will retain the earlier visual failure and correction history.

Verification: inspect actual CSS form geometry at 320 and 1440 CSS px (label/selector alignment, no overlap or horizontal overflow), run focused UI tests, full test suite, production build, and `git diff --check`. After independent review, ask the human to repeat the rendered `/student/dashboard` check for Title/Tags search, result open/back, continuation controls when present, visible keyboard focus, readability, and overflow. Do not mark the human check passed from synthetic geometry alone.
