# T06 test coverage report

Specification: `workflow/specs/role-based-dashboards.md` v0.2 (human-approved 2026-11-07).
Task: T06 test writing only. Implementation dispatch remains pending.

## Coverage added

`src/libconnect-mp4/test/SharedTheme.test.tsx` checks that both dashboard roles retain semantic main content, role-specific level-one headings, and an accessible logout button. It also checks for one common theme import in the application entry, token use by the login stylesheet, and dashboard theme-class/token use in the required common stylesheet plus the optional dashboard stylesheet when present. The responsive and focus hooks can likewise be supplied by the common stylesheet alone or supplemented by the optional page stylesheet. No assertion requires `DashboardViews.css` to exist.

The React/Jest environment does not calculate browser layout or reliably evaluate CSS media-query rendering. Scenario 12's actual no-horizontal-overflow, readable spacing, and visible focus appearance at desktop and 320 CSS pixel viewports require manual browser inspection for both dashboards. Scenario 13's future-page adoption convention is documented in `Overview.md`; runtime coverage for a future page is not applicable until such a page exists.

## Execution

See [`logs/tasks/role-based-dashboards/test-writer-T06.log`](../../../logs/tasks/role-based-dashboards/test-writer-T06.log) for both the initial run and the revised run. Both were expected red before theme implementation: the semantic dashboard test passed, while the revised stylesheet contract checks identify the missing required `theme.css`. The revised checks do not require the optional `DashboardViews.css`. No package changes or production-source edits were made.

## Gaps

- Responsive overflow and visual focus appearance need manual browser checks at desktop, mobile, and 320 CSS pixel widths.
- The shared-style checks establish token references and focus/responsive hooks, not pixel-level visual similarity or quality. Dashboard token-use checking expects a dashboard class in the component markup to be styled by the shared theme or optional page stylesheet.
- Reusable interface coverage verifies the existing shared logout behavior through both role views; visual class reuse remains covered by the theme implementation review.

Metrics: input tokens unavailable; output tokens unavailable; total tokens unavailable. Model and metric source unavailable to this test-writing agent.
