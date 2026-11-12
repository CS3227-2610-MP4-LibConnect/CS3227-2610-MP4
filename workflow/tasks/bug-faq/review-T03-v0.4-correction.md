# Bug FAQ T03 correction review — revision 1

Date: 2026-11-13
Specification/checklist/handoff: approved Bug FAQ v0.4
Dispatch: human-approved Batch 2 correction revision 1
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1`, clean archive of HEAD `c991ddf3f7d3105e4deb19fdc1c11affb5612a48` with exact available Batch 1 and Batch 2 overlays
Verdict: **Pass with follow-up**

## Dispatch and scope verification

Verified before testing that `assignment-batch-2.json` has `correctionDispatch.revision: 1`, the human approval dated 2026-11-13, and the approved correction scope limited to `StudentBugFaq.css`, `StudentBugFaq.tsx`, `StudentBugFaq.test.tsx`, and `docs/UserGuide.md`. Both correction reports and logs existed in the refreshed snapshot. It also contained the prior T03/T04 reports, human visual report, correction proposal, approved v0.4 artifacts, Batch 1 dependencies, and UI tests. The batch plan validator passed. The clean archive was freshly created for this review; it is not the prior Batch 2 review snapshot. Dependencies alone are junctioned.

Reviewed only the scoped correction files plus the approved spec/checklist/handoff, correction dispatch/evidence, prior reviews, and visual report. No implementation or test files were modified.

## Acceptance criteria

- **320px label overlap:** The original overlap is corrected. In the independent geometry diagnostic, the labels had no intersecting bounding boxes and every form element remained within the 320px viewport.
- **Residual mobile label association:** Low-severity follow-up. The second label still occupies an implicit second grid column due to the more specific `.student-bug-faq-search label:nth-of-type(2) { grid-column: 2 }` rule. At 320px its rectangle was approximately `x=231..312, y=94..112`, while the associated selector was at `x=8..219, y=124..168`. The HTML `for`/`id` association remains correct and the label text is readable, but it is horizontally detached from the selector. The full rendered human check is still needed to judge this at `/student/dashboard`.
- **Desktop geometry:** Pass. At 1440px the two labels were in separate columns at y=8 and the input, select, and Search button shared the control row at y=38; all elements were within the viewport and non-overlapping.
- **Unicode bound:** Pass. The UI trims the query and validates `Array.from(normalizedQuery).length`, matching the API's code-point counting. The new test verifies 100 emoji code points are retained and submitted, while 101 trigger a useful validation alert and no FAQ request.
- **Search/detail behavior:** Existing behavior remains covered: default Title, Tags selection, empty query validation, result cards, pagination, stale search response protection, literal rendering, read-only detail, and conversation pagination. The correction changes only the allowed UI scope.

## Finding

### T03-1 — Low: mobile selector label remains horizontally detached

Location: `src/codeclinic/src/tickets/StudentBugFaq.css`, mobile `@media (max-width: 520px)` and the earlier `.student-bug-faq-search label:nth-of-type(2)` rule.

Evidence: At 320px, no overlap or viewport overflow remained, but the “Search field” label was laid out in an implicit second column (`x≈231, y≈94`), while its `<select>` was in column 1 (`x=8, y≈124`). At 1440px the label and select align in column 2 as intended. Selector specificity explains the mobile result: `.student-bug-faq-search label:nth-of-type(2)` has specificity `(0,2,1)`, which outranks the mobile `.student-bug-faq-search label` rule at `(0,1,1)`, so `grid-column: 2` remains effective. The label remains correctly associated in HTML.

Risk/recommendation: At the required narrow width the visual relationship between the label and its selector is weaker than the form's vertical flow suggests. Consider explicitly assigning this label to column 1 under the mobile breakpoint. The human should repeat the full rendered route check before closing the visual criterion. This is recorded as follow-up rather than a confirmed failure because the text is readable, there is no overlap/overflow, and the programmatic label association is preserved.

## Checks

- Focused UI suite: **1 suite / 6 tests passed**.
- Full suite: **86 suites passed / 1,661 tests passed; 6 suites and 10 tests skipped** (emulator-gated), 92 suites / 1,671 tests total.
- Production build: **passed**, optimized bundle 93.65 kB gzip JS / 7.46 kB gzip CSS.
- Independent Playwright geometry check with actual FAQ CSS and matching synthetic form markup: at 320 and 1440 CSS px, no element pairs overlapped and all form elements stayed within viewport bounds. Exact measurements and command are in the execution log. This does not replace a rendered human check of `/student/dashboard`.

## Unverified criteria

The human visual report records only the earlier overlap failure. The human has not repeated the complete check after this correction. Title/Tags searches, open/back, continuation controls, visible focus, full dashboard readability, and horizontal overflow remain unverified by the human. No live Firestore/Emulator or production-index readiness was tested. T03 is not marked complete; the checklist remains unchanged.
