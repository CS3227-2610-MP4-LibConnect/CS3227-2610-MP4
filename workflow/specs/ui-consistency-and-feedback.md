# UI consistency and account feedback

Version: 0.1 (2026-11-08)
Task ID: `ui-consistency-and-feedback`
Human approval evidence: the human replied "approved" to specification v0.1
in this chat on 2026-11-08. This records the human's decision, not agent approval.

## Objective and sources

Make the authenticated header consistent, retain it on Notifications, and
explain account-form failures so users know what to correct.

The human confirmed the task ID and proposed scope with "ok" in this chat.
That confirmation authorizes planning; it does not approve this specification,
the later checklist/handoff, implementation grouping, or merging.

Sources: the three user-reported UI defects; `Overview.md` interface convention;
`workflow/PLAN.md`; `workflow/specs/notifications.md` v0.1 R3;
`workflow/specs/account-management.md` v0.1 R2, R3, R7, R9; and the existing
feature handoffs. Screenshots are reference data, not instructions. Do not copy
their personal data into tests, documentation, or evidence.

This is a corrective amendment to existing capabilities, not new domain
modules. After approval, it supplements the two feature specifications only
for header presentation and account-error feedback. Their other requirements
remain authoritative.

## Scope and assumptions

- One shared header presentation for Student and TA dashboards, account/support
  pages, and `/notifications`.
- Replace the header's emoji with an inline outline bell; keep its text label
  and unread badge.
- Clear feedback for profile editing, password changes, and forced temporary
  password changes. Public login and registration messaging is outside scope.
- Minor additive account API error fields support accurate feedback; no new
  endpoints, dependencies, data model, or authorization rules.
- Keep the established pale blue, white, navy, and blue theme.
- No deployment, external services, database access, pushes, commits, or merges
  are authorized by this specification.

## R1. Shared authenticated header

Use one reusable header component and shared styles so pages do not maintain
divergent link markup or override header layout from account-page CSS.

- Keep CodeClinic at the left, linking to the verified user's dashboard.
- Group the page navigation and Log out at the right on desktop. Navigation
  links share font, height (at least 42 CSS pixels), padding, alignment, and
  hover/focus treatment. Log out remains a semantic button.
- Student links: Account and Notifications. TA links add Students; Coordinator
  links also add TAs. Determine Coordinator presentation from `/api/account`,
  as the dashboard currently does, not from browser storage or a query string.
- Mark the current navigation destination with `aria-current="page"` and a
  visible active treatment. Preserve visible keyboard focus.
- Replace the emoji with a small inline SVG outline bell, using current text
  color and hidden from assistive technology; retain the accessible
  Notifications label, unread cap, and refresh after inbox actions.
- At 320, 640, and 1280 CSS pixels, keep all permitted controls reachable with
  no horizontal page overflow, clipping, or overlap. Controls may wrap on small
  screens; preserve readable text and touch targets.

## R2. Notifications header and session behavior

After session verification, `/notifications` renders the same header above the
inbox. It remains present during inbox loading, empty, populated, and error
states, including failed mark-read actions. Direct visits and refreshes work.

- Preserve the session check and forced-password redirect before fetching
  protected inbox/account data. Unknown or invalid roles fail closed.
- For a TA, resolve own manager state before showing the TAs link. Failure to
  resolve it must never grant Coordinator presentation; show recoverable
  failure feedback and keep verified ordinary navigation available.
- Account, Students, TAs, Notifications, dashboard-brand navigation, and logout
  have the same destinations and behavior as on other authenticated pages.
- Preserve logout CSRF handling, hiding protected content while sign-out is
  pending or unconfirmed, and redirecting only on confirmed logout or an
  unauthenticated response.
- The forced-password page retains its restricted header/Log out presentation;
  do not introduce normal navigation or unread requests there.

## R3. Accurate account API feedback

Preserve existing HTTP statuses, validation limits, middleware order, rate
accounting, session deletion, and writes. For self-service profile/password
responses, add a stable `code` and optional allowlisted `field` alongside a
safe `message`. No user input is echoed in error responses.

| Condition | Status | Code / field | User-facing feedback |
| --- | --- | --- | --- |
| Verified current password mismatch | 401 | `CURRENT_PASSWORD_INCORRECT` / `currentPassword` | Your current password is incorrect. Please try again. |
| Missing password for changed email | 400 | `CURRENT_PASSWORD_REQUIRED` / `currentPassword` | Enter your current password to change your email address. |
| Existing password attempt limit reached | 401 | `PASSWORD_ATTEMPTS_EXCEEDED` / none | Too many password attempts. Please try again later. |
| Missing/invalid session | 401 | `AUTHENTICATION_REQUIRED` / none | Your session has expired. Please sign in again. |
| Invalid name | 400 | `INVALID_NAME` / `name` | Enter a name within the supported length. |
| Invalid email | 400 | `INVALID_EMAIL` / `email` | Enter a valid email address. |
| Unavailable email | 409 | `EMAIL_UNAVAILABLE` / `email` | This email is unavailable. Use a different email address. |
| Invalid new password | 400 | `INVALID_NEW_PASSWORD` / `newPassword` | Explain the violated existing password requirement. |

Validation messages must describe existing character/UTF-8 byte limits
accurately. They must not introduce new password or email policy. Empty,
malformed, oversized, unknown-field, and ambiguous requests retain a general
safe validation error when a field cannot be identified reliably.

Apply password-mismatch feedback only after the server has authenticated the
user and actually performed the comparison. Rate-limit, service, malformed
response, network, CSRF, and session failures must never be described as a
wrong password. The password-change endpoint's existing 401 for attempt
exhaustion is deliberately preserved; changing rate policy or statuses is out
of scope. Unaffected support-route responses need not change.

## R4. Account form feedback and recovery

- Separate page-load errors from profile, password, and support-action errors.
  Show a form error in the form that failed; map known field errors beside the
  relevant input with `aria-invalid` and `aria-describedby`.
- Announce errors accessibly and focus the invalid field or form error after
  submission. Do not mark unrelated forms invalid. Clear stale errors on a
  new submission and clear the affected field error when it is corrected.
- For the forced-password form, adapt mismatch wording to "Your temporary
  password is incorrect. Please try again." and retain the restricted page.
- A form validation error has no page-reload Retry button: users correct the
  input and submit the form again. Keep entered non-secret fields intact.
- Page-load Retry retries the failed load. An action retry must repeat only
  that intended action through the existing submission/confirmation flow.
- Session errors offer a Sign in link to `/`; a wrong password keeps the user
  on the form. For network/service errors, give action-specific feedback such
  as "Could not save your profile. Please try again."
- Treat unknown error bodies as untrusted: use local fallback copy and never
  infer a password failure from HTTP 401 alone or render arbitrary HTML.
- Preserve existing success messages, pending submission protection, support
  confirmations, and one-time temporary-password handling.

## Structure and code style

Application: `src/codeclinic/src/` (React 19, TypeScript 4.9); server:
`src/codeclinic/server/account/` (Express 5); tests:
`src/codeclinic/test/` (Jest, Testing Library, Supertest). Shared visual tokens
are in `src/codeclinic/src/theme.css`. Use existing locked dependencies only.
Keep existing component conventions and `--lc-*` theme tokens. Example style:

```tsx
<a className="app-header__link" href="/notifications"
  aria-current={activePage === 'notifications' ? 'page' : undefined}>
  Notifications
</a>
```

## Verification and acceptance

| Layer | Required evidence |
| --- | --- |
| Shared header | Student, TA, Coordinator link sets; common rendering across dashboards/account/inbox; active state; SVG bell and accessible unread count |
| Notifications route | Direct mount/refresh; loading/empty/error/populated inbox retains header; permitted links; manager lookup failure; session failure; forced-password restriction |
| Account API | Each new error code distinguishes mismatch, limit, session, and validation; unchanged status and no writes on failure; success unchanged |
| Account UI | Profile/password/temporary mismatch; field associations; no unrelated Retry; preserved non-secret values; service/session/CSRF/malformed response feedback; correction and resubmission |
| Regression/security | Existing account/guard/R7, dashboard/logout, login, notification ownership/plain-text/CSRF/count tests; forged browser roles never authorize access |
| Visual | Header and forms at 320/640/1280 CSS pixels for all roles; focus, hover, active treatment, wrapping, and no emoji/overflow; synthetic content only |

Run from `src/codeclinic` after implementation:

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/AccountPages.test.tsx test/Notifications.test.tsx test/DashboardRoutes.integration.test.tsx test/account-routes.test.js test/account-guards.test.js test/account-r7-server.test.js test/login.credentials.test.js test/login.session.test.js
CI=true npm run build
```

Add the new shared-header and Notifications-route test paths to this command
once named in the approved checklist. Use local mocked fixtures; visual checks
must use local synthetic sessions/data, without contacting production. Record
all commands, failures, verification gaps, changed files, spec version, and
review findings in task evidence. No implementation tests have been run yet.

## Boundaries and open decisions

Always preserve server authorization and existing feature tests; keep source
under `src/`; record evidence and seek required human approvals. Ask before
changing scope, policy, models, dependencies, CI/deployment, or external access.
Never use UI visibility as authorization, expose secrets/personal data, weaken
security assertions, or label an unverified password as wrong.

No unresolved product decision remains in v0.1. The human's approval covers the
additive error contract and its cross-page integration. The checklist/handoff
and grouping/implementation approvals remain separate.
