# T03 Scoped Correction Report — Bug FAQ v0.4

Status: Corrected and verified; independent re-review pending.
Specification/checklist/handoff: approved Bug FAQ v0.4. This scoped correction followed the explicit human-approved correction dispatch revision 1 in `assignment-batch-2.json` (2026-11-13).

## Findings addressed

- Search labels and controls now occupy distinct grid rows on narrow screens. At widths up to 520px, the two labels, input, selector, and submit button have explicit sequential rows. Desktop placement remains the existing two-column label/control layout with Search aligned to the controls.
- Removed HTML `maxLength`, which counts UTF-16 code units. Local submission validation now counts Unicode code points after trimming and permits 1–100; more than 100 displays a useful message and makes no request.
- Added behavioral boundary tests for exactly 100 emoji code points and 101 emoji code points.

## Files changed

- `src/codeclinic/src/tickets/StudentBugFaq.css`
- `src/codeclinic/src/tickets/StudentBugFaq.tsx`
- `src/codeclinic/test/StudentBugFaq.test.tsx`

## Verification

- Focused UI suite: `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx` from `src/codeclinic` — PASS, 1 suite / 6 tests. The final run was repeated after the last mobile-grid adjustment and includes the 100/101 code-point request boundary plus dashboard/search/detail coverage. Existing Node `punycode` deprecation warning appeared.
- Playwright CSS geometry diagnostic at 320 and 1440 CSS px — PASS. At 320, the measured row positions were label y=32, input y=62, second label y=118, select y=148, Search y=204; all remained within the viewport and did not overlap. At 1440, labels occupied distinct columns at y=32; input, select, and Search controls aligned at y=62 with no viewport overflow. The diagnostic used synthetic form markup and actual FAQ CSS, not the human browser route.

## Open visual verification

The earlier human report of label overlap at 320 px remains valid historical evidence. The human must repeat the requested rendered `/student/dashboard` check after this correction; no new human browser evidence or screenshot was available for this correction. Overflow/readability of result cards, keyboard flow, search outcomes, detail navigation, and pagination remain pending human confirmation. The Playwright diagnostic is not a substitute for that check.

No server, guide, requirement, checklist, handoff, dependency, or deployment files were changed in T03.
