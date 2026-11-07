# T04 independent review

**Verdict: changes required.** Reviewed specification v0.1, checklist and handoff v0.2, T01 final design, and approved batch 3. Because the implementation was uncommitted in the shared workspace, I reviewed the exact working diff against HEAD; this is the manifest's documented separation exception.

The member brand link, sticky navigation, logout control, text-only book cards, synopsis fallback/expansion, and focused component tests align with R1/R4. The focused React suites passed; exact command and result are in [review-T04-log.md](review-T04-log.md).

## Findings

- **Medium — unscoped shared dashboard regression:** `src/DashboardViews.css` changes `.dashboard-page` width, minimum height, and padding globally, while that class is used by both dashboards. It also removes `.dashboard-page + button`, which styled the librarian dashboard's logout button. These changes alter the librarian page despite T04 being limited to member navigation/catalog presentation. Scope the catalog layout changes to `.member-dashboard` and preserve the librarian logout styling.
- **Unverified — responsive visual acceptance:** no rendered browser inspection was available. Sticky behavior while scrolling, overlap, horizontal overflow at 320 CSS pixels, and visual synopsis truncation remain unverified. CSS and component behavior were inspected; a later integration visual check is still needed.

No server or authorization implementation was changed in this batch. The member card content is rendered as React text. No review-only tests were added.

Combined batch status remains **changes required**. See [review-T04-log.md](review-T04-log.md) for checks and review conditions.
