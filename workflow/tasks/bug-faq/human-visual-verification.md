# Bug FAQ human browser verification

Date: 2026-11-13 (Asia/Singapore)

## Reported observation

The human was asked to inspect `/student/dashboard` at a 320 CSS px viewport, search by Title and Tags, open and return from a result, use continuation controls when present, and check keyboard focus, readability, and horizontal overflow. The human reported: **“search bug faq” and “search field” text is overlapping**.

Result for label readability at 320 CSS px: **failed**. This independently confirms finding T03-1 in `review-T03-v0.4.md`. No screenshot was supplied; the textual observation is sufficient to identify the two overlapping labels, and the reviewer reproduced their shared grid cell with a synthetic CSS geometry diagnostic.

The human did not report results for Title/Tags search outcomes, detail open/back, continuation controls, keyboard focus, or horizontal overflow. Those criteria remain **unverified**. Recheck the full browser sequence after the approved layout correction; do not record visual verification as passed before that result.

## Recheck after correction revision 1

On 2026-11-13, after the first CSS correction, the human replied to the 320 CSS px browser recheck request: **“refer to the screenshot in the root directory, the ‘search field’ text is not aligned”**. The screenshot was inspected and copied to `logs/tasks/bug-faq/visual/faq-mobile-search-field-misaligned-2026-11-13.png`; the root original remains intact.

The screenshot shows the **Search field** label at the right side of the FAQ form, while its Title selector and the search input are on the left. This matches the independent reviewer’s measured residual layout: the label remained in an implicit second grid column because the desktop `label:nth-of-type(2)` rule outranked the mobile column override. The label and selector are programmatically linked, but the human has confirmed the visual alignment is unsatisfactory. **Visual alignment failed on recheck.**

The human did not report the other requested interactions or keyboard/overflow results. Those criteria remain unverified. The screenshot contains no ticket content or personal names.

## Recheck requested after correction revision 2

The human approved the CSS-only alignment correction on 2026-11-13. The implementer and independent reviewer measured the Search field label and selector at the same x coordinate at 320 and 1440 CSS px using actual FAQ CSS and synthetic form markup. No synthetic overlap or overflow was found; a 3px focus outline was measured. The human rendered-route check after revision 2 is still pending. Ask the human to refresh `/student/dashboard` at 320 CSS px and report Title/Tags search, result open/back, available Search more and Load more replies controls, label readability/alignment, horizontal overflow, and visible focus while tabbing through FAQ controls. A screenshot cropped to the FAQ area is needed only if anything still looks wrong; avoid ticket content and names where possible.

## Human result after correction revision 2

On 2026-11-13, in direct response to the full 320 CSS px verification request above, the human reported: **“verified it works”**. Record this as a pass for the requested rendered-route check, including the previously failed label alignment. The human did not supply a new screenshot or separate measurements for each interaction; this record reflects their overall verification report. Preserve the earlier failure and screenshot as history.
