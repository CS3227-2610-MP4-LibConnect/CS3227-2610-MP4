# Independent review: U01–U03 navigation

Task/spec/checklist/handoff reviewed: `ui-consistency-and-feedback` v0.1.
Scope: U01 shared header, U02 existing-page integration, and U03 Notifications route.
Exact implementation inspected in `/private/tmp/ui-consistency-review`, based on
`66517a756bd4f477348783b97341964e36bb4c32` plus the supplied final overlay.
All 18 source/test hashes in `logs/tasks/ui-consistency-and-feedback/review-source-manifest.json`
matched the isolated snapshot. The complete implementation patch was inspected;
this review reports assigned UI/navigation scope, with server and form-feedback
details assigned to other reviewers.

## Verdict

**Pass.** No actionable U01–U03 findings. The implementation meets the assigned
acceptance criteria by code inspection, targeted automated tests, and the U06
synthetic-browser evidence. This is a review assessment, not a merge approval.

## Criteria and evidence

- **U01 / R1:** `AppHeader` supplies the Student and TA link sets and gates the
  TAs link on the caller-provided manager status; it does not consult browser
  storage or authorize requests. Brand routes to the role dashboard, logout is
  a button, links expose `aria-current`, and the notification bell uses a
  decorative inline SVG, readable label, capped count, and existing refresh
  event. Restricted mode omits navigation and never mounts the bell. The
  header CSS gives controls at least 42px height with visible focus and hover
  states. `AppHeader.test.tsx` and `Notifications.test.tsx` pass. U06's
  `visual/viewport-checks.json` and synthetic screenshots document all three
  roles at 320/640/1280 CSS pixels, with no overflow, overlap, or clipping.
- **U02 / R1–R2:** dashboards and account/support/forced-password pages now use
  `AppHeader`. Dashboard role and manager values continue from verified parent
  data; the account page supplies the loaded account response. Forced-password
  mode sets restricted presentation. Existing protected logout CSRF, pending
  state, confirmation, and failure behavior remain in `DashboardLogout`.
  `DashboardRoutes.integration.test.tsx`, `AccountPages.test.tsx` (including
  the scoped header cases), and `SharedTheme.test.tsx` pass. The retained
  `.student-navbar` focus selector is only a compatibility selector and does
  not override `.app-header` layout.
- **U03 / R2:** `NotificationsRoute` verifies session and forced-password
  state before mounting account or inbox requests, fails closed on unknown
  roles, and resolves a TA's own manager presentation through `/api/account`.
  Lookup failure preserves ordinary verified navigation and offers a scoped
  retry while keeping the inbox mounted; only confirmed manager status exposes
  TAs. The shared header persists through inbox states and the existing
  `DashboardLogout` wrapper hides protected content during pending or
  unconfirmed logout. `NotificationsRoute.test.tsx` and
  `Notifications.test.tsx` cover the state, retry, and logout paths. The U06
  direct reload and inbox-state evidence is synthetic and local.

## Verification

From `/private/tmp/ui-consistency-review/src/codeclinic`:

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/AppHeader.test.tsx test/NotificationsRoute.test.tsx test/Notifications.test.tsx test/DashboardRoutes.integration.test.tsx test/SharedTheme.test.tsx
```

Result: **PASS**, 5 suites, 58 tests, 0 snapshots. No source or test files were
modified and no review-only tests were added. The U06 report records the
successful production build and viewport/keyboard checks; this review did not
rerun the build. Browser evidence uses mocked synthetic responses, not a live
backend.

## Findings and unverified criteria

No U01–U03 findings. The visual matrix is supported by the U06 report and its
JSON/screenshots; actual authorization remains a server responsibility and was
not reassessed here beyond confirming the UI props are presentation-only.
Cross-boundary server/API and account-form error behavior are outside this
review assignment. No other U01–U03 criterion remains unverified.

## Runtime usage

Model: `gpt-6-luna` (reviewer profile assignment). Input tokens: unavailable.
Output tokens: unavailable. Total tokens: unavailable. Metric source: runtime
did not expose token usage to this agent.

Factual command/hash evidence: [review-navigation.log](../../../logs/tasks/ui-consistency-and-feedback/review-navigation.log).
