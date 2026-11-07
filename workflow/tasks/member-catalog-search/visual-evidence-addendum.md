# T06 visual evidence addendum — 2026-11-08

The human supplied screenshots under `visual-T06/` and reported that keyboard Tab moves through the search controls. At the time of the first screenshots, the local catalog had only ten Book records and did not show `Load more books`. No browser session, credentials, or private user data were provided.

| Evidence | Supported observation | Limit |
| --- | --- | --- |
| `pinned_navbar.png` (1535×701) | Desktop catalog is scrolled; `LibConnect` and Log out remain visible at the top, with visible cards unobscured in the captured viewport. | Does not show narrow-screen scrolling. |
| `advanced_search.png` (324×486) | Navbar and expanded advanced fields are visible in a narrow viewport; captured fields are arranged in one column and fit within the screenshot. | Only the upper part of the form is shown; no focused control or whole-page overflow check is visible. |
| `visible_truncation.png` (274×213) | A long synopsis displays readable lines ending in an ellipsis, and no expansion button appears. | Assistive-technology full text is covered by component/source checks, not the image. |
| Human observation | Keyboard Tab moves through search controls. | This observation does not show the whole Tab sequence. |
| `tab_focus.png` (1192×687) | The Title search field visibly shows a blue keyboard focus ring in the expanded advanced search form. | The image is desktop-width and does not show focus on every control. |
| `load_more_books.png` (1209×666) | The scrolled desktop catalog visibly shows `Load more books` beneath Book cards, with the navbar still present. | The image does not show the result after activating the button. The synthetic interaction test covers that behavior. |
| `320px_end_of_page.png` (327×491 image, roughly 320-pixel content area) | At the end of a narrow scrolled catalog, the sticky navbar, a complete card, and `Load more books` fit between the visible left and right page edges; no horizontal scrollbar or clipped card is visible. | A still image cannot prove every intermediate scroll position or button activation. The earlier narrow form screenshot and interaction tests cover those separate aspects. |
| Existing `test/MemberCatalogSearch.test.tsx` continuation test | A synthetic next cursor renders `Load more books`; activating it requests the cursor and appends the next page. | No rendered continuation control was visible with the ten-record local dataset. |

The independent reviewer inspected the original three screenshots and recommended retaining T06 as unchecked pending visible focus, whole-page/narrow-scroll evidence, and rendered continuation or explicit human acceptance of those visual limitations. The later `tab_focus.png` supplies the visible-focus evidence for the Title field. The prior automated/security review remains pass with follow-up. The current synopsis requirement is the v0.2 no-expansion-button behavior, superseding the old expansion wording in the original T06 review report. No screenshot was modified.

After the original screenshots, the human requested a 30-Book local seed. The emulator then contained 30 Books and 90 BookCopy documents, verified as three copies per Book. The catalog's page size is 100 Books; therefore that fixture did not render `Load more books`.

The human subsequently requested a 120-Book local seed. The emulator now contains 120 Books and 360 BookCopy documents, verified as three copies per Book. A read-only paginated query returned 100 then 20 Books. The later `load_more_books.png` confirms the rendered continuation control is visible. The still later `320px_end_of_page.png` supplies the previously missing narrow scrolled view; independent review is pending before the T06 checklist is updated.
