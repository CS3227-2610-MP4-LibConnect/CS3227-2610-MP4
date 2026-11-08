# UI consistency and feedback — acceptance checklist

Version: 0.1 (2026-11-08)
Task ID: `ui-consistency-and-feedback`
Specification: `workflow/specs/ui-consistency-and-feedback.md` v0.1,
human-approved in this chat on 2026-11-08.
Human approval evidence: the human replied "approved" to checklist v0.1 and
handoff v0.1 in this chat on 2026-11-08. This records their decision, not agent
approval. The human approved grouping proposal v0.1 and implementation in this chat on 2026-11-08. This records the human decision, not agent approval. The orchestrator validated the grouped checklist before dispatch. Implementation and independent review completed on 2026-11-09. The human then replied "approved, commit bah", approving the reviewed result and requesting a local commit. No push or merge was requested.
Handoff: `handoff.md` v0.1.

This checklist is grouped under approved proposal v0.1. The human approved the grouping and implementation on 2026-11-08; the orchestrator must confirm this grouped checklist before dispatch. The orchestrator owns checkbox updates after reconciling independent evidence.

## Implementation tasks

## Group 1

- [x] U01: Create the shared role-aware header and replace the emoji bell with an outline SVG.
  - Requirements: R1; the restricted-header portion of R2.
  - Acceptance: CodeClinic links to the correct dashboard; Student/TA/Coordinator
    link sets are exact; navigation is grouped and styled consistently; Log out
    is a button; active destinations use aria-current; focus is visible; targets
    are at least 42 CSS pixels tall. The SVG is decorative, while the readable
    Notifications label, capped unread badge, and refresh behavior remain.
    Restricted mode renders brand/Log out without normal navigation or unread
    requests. The component accepts verified role data and a logout callback;
    it does not derive privilege from storage or duplicate authorization.
  - Files: new `src/codeclinic/src/AppHeader.tsx` and `AppHeader.css`;
    `src/codeclinic/src/notifications/Notifications.tsx` and `Notifications.css`;
    new `src/codeclinic/test/AppHeader.test.tsx`. Notification regression tests
    may be extended by the test writer without changing existing assertions.
  - Verify: header role/active/restricted/accessibility tests; existing unread
    count and refresh tests. Actual responsive layout is verified in U06.
  - Depends on: none.

- [x] U04: Add safe, distinct error codes to self-service account responses without changing authorization or policy.
  - Requirements: R3.
  - Acceptance: the eight R3 conditions return their specified status/code/field
    and safe message. Only a completed failed comparison produces a mismatch
    code; rate exhaustion and missing sessions are distinct. Invalid fields
    receive accurate existing-limit feedback; ambiguous/unknown-field/oversized
    bodies retain safe general errors. Guard order, all current validation
    limits, rate accounting, no-write failure behavior, successful updates,
    session invalidation, support authorization and public-login errors remain.
  - Files: `src/codeclinic/server/account/routes.js` and `guards.js`;
    `src/codeclinic/test/account-routes.test.js`, `account-guards.test.js`,
    `account-r7-server.test.js`.
  - Verify: mismatch/profile-email/password cases, missing password, validation
    limits, unavailable email, session failure, and exhausted-rate tests;
    no-write assertions, existing guards/R7/login regressions. Use synthetic
    records only; no emulator or cloud database required.
  - Depends on: none.

## Group 2

- [x] U02: Use the shared header on dashboard, account, support, and forced-password pages.
  - Requirements: R1 and R2's existing-page/logout constraints.
  - Acceptance: DashboardLogout and AccountPages render the same header;
    per-page CSS no longer overrides shared header layout. Destinations,
    server-verified role/manager presentation, support links, and restricted
    forced-password navigation are preserved. Logout CSRF handling, confirmed
    redirect, and hiding protected content on pending/unconfirmed dashboard
    sign-out are preserved. No unrelated account form behavior changes here.
  - Files: `src/codeclinic/src/DashboardLogout.tsx`, `AccountPages.tsx`,
    `DashboardViews.css`, `AccountPages.css`;
    `src/codeclinic/test/DashboardRoutes.integration.test.tsx`. AccountPages and
    AppHeader test additions may be owned separately by the test writer.
  - Verify: dashboard role/destination/logout integration tests; AccountPages
    header/restricted-form regressions; inspect removal of legacy CSS overrides.
  - Depends on: U01.

## Group 3

- [x] U03: Keep the shared header visible throughout the Notifications inbox experience.
  - Requirements: R2.
  - Acceptance: direct visits and refreshes render the header after successful
    session verification; it remains during loading, empty, populated, fetch
    error, and mark-read error states. Student/TA/Coordinator links and brand
    destinations match the dashboards. Manager lookup failure shows recoverable
    feedback, preserves verified ordinary navigation, and hides TAs. Unknown
    roles fail closed. Unauthenticated/forced-password sessions do not fetch
    protected inbox/account data. Logout uses the existing protected wrapper
    behavior; pending/unconfirmed sign-out hides inbox content.
  - Files: `src/codeclinic/src/NotificationsRoute.tsx`;
    new `src/codeclinic/test/NotificationsRoute.test.tsx`.
  - Verify: route tests for role/state matrix, denied sessions, manager lookup
    retry, unread refresh, navigation and logout; notification regression suite.
  - Depends on: U01, U02.

- [x] U05: Show actionable, accessible errors in the account form that failed.
  - Requirements: R4.
  - Acceptance: separate load/profile/password/support errors; known field errors
    appear by the relevant input with aria-invalid/aria-describedby and focus
    on failure. Correcting that field or resubmitting clears stale errors.
    Password mismatch stays on the form; forced-password wording identifies the
    temporary password. Session errors offer Sign in. Validation errors have no
    page-reload Retry; load Retry reloads only the failed load. Action retry
    respects existing confirmation/submission flows. Preserve non-secret input,
    pending protection, success feedback and temporary-password handling.
    Network/service/CSRF/unknown-code/malformed-response failures use safe local
    action-specific copy, never a guessed password error or raw server HTML.
  - Files: `src/codeclinic/src/AccountPages.tsx`, `AccountPages.css`;
    optional new `src/codeclinic/src/accountFeedback.ts`;
    `src/codeclinic/test/AccountPages.test.tsx`.
  - Verify: form-scoped errors and accessibility; mismatch/correction/resubmit;
    session/attempt-limit/network/service/CSRF/malformed cases; load retry
    isolation; support confirmation and one-time-password regressions.
  - Depends on: U02, U04.

## Group 4

- [x] U06: Verify responsive appearance, run the required regressions, and prepare implementation evidence.
  - Requirements: R1–R4 verification matrix and task evidence rules.
  - Acceptance: inspect all three roles at 320, 640 and 1280 CSS pixels using
    synthetic local fixtures. Verify no overflow/overlap/clipping, no emoji,
    readable controls, focus/active/hover treatment, header across inbox states,
    and form error placement. Run the combined targeted tests and production
    build. Record commands/results, visual evidence, gaps, failures, spec
    version, changed files and subagent usage. Report rather than hide any
    unverified acceptance criterion. No merge/commit/publication is performed.
  - Files: `workflow/tasks/ui-consistency-and-feedback/implementation-report.md`,
    per-item implementation reports; visual artifacts and factual logs under
    `logs/tasks/ui-consistency-and-feedback/`. No new source scope is granted
    by this verification task; corrections return to the responsible task.
  - Verify: commands below; documented browser measurements/screenshots and
    keyboard checks. Static CSS assertions alone are not visual evidence.
  - Depends on: U01–U05.

## Verification commands

From `src/codeclinic`, using installed locked dependencies:

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/AppHeader.test.tsx test/NotificationsRoute.test.tsx test/AccountPages.test.tsx test/Notifications.test.tsx test/DashboardRoutes.integration.test.tsx test/SharedTheme.test.tsx test/account-routes.test.js test/account-guards.test.js test/account-r7-server.test.js test/account-server-wiring.test.js test/account-store.test.js test/notifications.api.test.js test/login.credentials.test.js test/login.session.test.js
CI=true npm run build
```

The test writer runs focused new tests before production changes, records their
expected failures, and retains existing security assertions. U06 and independent
review run the combined command. A missing tool, unavailable local browser, or
missing dependency is a reported verification gap, not permission to install
new dependencies or contact external services. Broaden verification only for a
new failure, changed behavior, or unresolved concern.

## Verification commands

From `src/codeclinic`, using installed locked dependencies:

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/AppHeader.test.tsx test/NotificationsRoute.test.tsx test/AccountPages.test.tsx test/Notifications.test.tsx test/DashboardRoutes.integration.test.tsx test/SharedTheme.test.tsx test/account-routes.test.js test/account-guards.test.js test/account-r7-server.test.js test/account-server-wiring.test.js test/account-store.test.js test/notifications.api.test.js test/login.credentials.test.js test/login.session.test.js
CI=true npm run build
```

The test writer runs focused new tests before production changes, records their
expected failures, and retains existing security assertions. U06 and independent
review run the combined command. A missing tool, unavailable local browser, or
missing dependency is a reported verification gap, not permission to install
new dependencies or contact external services. Broaden verification only for a
new failure, changed behavior, or unresolved concern.
