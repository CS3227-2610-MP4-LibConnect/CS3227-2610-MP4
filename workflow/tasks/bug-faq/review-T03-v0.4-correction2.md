# Bug FAQ T03 correction 2 review

Date: 2026-11-13
Specification/checklist/handoff: approved Bug FAQ v0.4
Dispatch: human-approved Batch 2 correction revision 2 (CSS-only)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction2-r1`, fresh clean archive of HEAD `c991ddf3f7d3105e4deb19fdc1c11affb5612a48` with current Bug FAQ Batch 1/2 overlay
Verdict: **Pass with follow-up**

## Dispatch and scope verification

Before tests, verified `assignment-batch-2.json` has `correctionDispatch.revision: 2`, human approval recorded on 2026-11-13, and scope limited to `src/codeclinic/src/tickets/StudentBugFaq.css`. The referenced implementation report/log and correction proposal exist in the fresh snapshot. The prior T03/T04 review reports, human visual-verification record and screenshot, approved v0.4 spec/checklist/handoff, current-state, and current Batch 1/2 implementation artifacts were also overlaid. The assignment plan validator passed. The snapshot was freshly generated from `git archive HEAD`; dependencies are junctioned. Two unrelated stale Batch 1 allowed-file entries (`src/codeclinic/server/server.js` and `src/codeclinic/server/tickets/index.js`) do not exist in the workspace or archive and were not overlaid.

Reviewed the complete combined T03/T04 behavior and the exact CSS-only delta from revision 1. No production, test, documentation, spec, checklist, handoff, or manifest files were modified.

## Acceptance criteria and geometry

- **Mobile label alignment:** Pass. The revision adds a specificity-matched mobile override for `.student-bug-faq-search label:nth-of-type(2)` to set `grid-column: 1`, directly above its selector. The rendered synthetic form has Search field label and selector aligned at both tested widths.
- **320 CSS px geometry:** Independent Playwright check found no overlapping element rectangles and no viewport overflow. With the synthetic form's 8px body margin, Search field label and selector both start at `x=8`; label `y=94`, selector `y=124`. The other items were label `x=8,y=8`, input `x=8,y=38`, and Search button `x=8,y=180`, each 304px wide and within the viewport.
- **Desktop geometry:** At 1440 CSS px, Search field label and selector both start at `x≈895.45`; the label is at `y=8` and the selector at `y=38`. The other label is at `x=8,y=8`, with input and Search button on the controls row. No overlap or viewport overflow was found.
- **Specificity correctness:** The mobile `.student-bug-faq-search label:nth-of-type(2)` rule has specificity `(0,2,1)` and wins over the base `.student-bug-faq-search label:nth-of-type(2)` desktop column assignment equally by specificity because the mobile rule appears later, so `grid-column: 1` overrides `grid-column: 2` within the media query. This was confirmed by computed element coordinates.
- **Keyboard focus styles:** CSS retains the existing `:focus-visible` outline. In the synthetic form, tabbing to the search input at 320 and 1440 widths produced computed `outline-style: solid`, `outline-width: 3px`.
- **Combined T03/T04 behavior:** Pass by current code and regression tests. T03 Title/Tags search, 100/101 Unicode validation, cards, detail, continuation, stale-response protection and safe literal rendering remain intact. T04's corrected User Guide accurately describes opening a title/tag card, **Search more**, and **Load more replies**. T04 has no source change in this CSS-only dispatch.

No new findings identified. The earlier human-observed overlap/misalignment is corrected in the CSS geometry check. This is not a claim that the rendered `/student/dashboard` route has passed the required human check.

## Checks

- Focused UI suite: **1 suite / 6 tests passed**.
- Full suite: **86 suites passed, 1,661 tests passed; 6 suites and 10 tests skipped** (emulator-gated), 92 suites / 1,671 tests total.
- Production build: **passed**, optimized bundle 93.65 kB gzip JS / 7.47 kB gzip CSS.
- CSS geometry/focus diagnostic: **passed** at 320 and 1440 CSS px; exact command and metrics are in the log.
- CSS delta whitespace check against the prior revision-1 snapshot: `git -c core.autocrlf=false diff --no-index --check -- <rev1 CSS> <rev2 CSS>` emitted no whitespace errors. Git returned the normal changed-file status; only the mobile selector override was added.

## Unverified criteria and risks

The human's prior screenshot/report confirms the revision-1 visual failure. No human rendered-route recheck exists after revision 2. The full required sequence remains open at `/student/dashboard`, 320 CSS px: Title and Tags searches, open/back, available continuation controls, visible keyboard focus, readability, and horizontal overflow. Synthetic markup/CSS geometry does not substitute for human route evidence. Live Firestore/Emulator and production index readiness remain unverified; emulator-gated suites were skipped. Checklist state remains unchanged and T03 is not marked complete.
