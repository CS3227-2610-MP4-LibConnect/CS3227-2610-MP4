# Browser verification — 2026-11-08

Task/spec/checklist/handoff: `ui-consistency-and-feedback` v0.1.
Owner: orchestrator, supporting U06. Used the successful local production build
after the two recorded ESLint corrections. CUA in-app browser only; no real
account, password change, database, external service or production session.

Preview: temporary mock-only server on `127.0.0.1:4174`, started from
`/private/tmp/ui-consistency-preview/src/server.cjs`. Its responses use only
synthetic Example User/example.edu content; profile submissions always return
configured mock failures and never update data. This fixture is outside the
repository and is not shipped. The existing user app on port 3000 was untouched.

## Viewport matrix and screenshots

Inspected Student, TA and Coordinator inbox headers at 320, 640 and 1280 CSS
pixels, 900 pixels tall. All nine measured cases had scrollWidth equal to
viewport width, no intersecting navigation-control rectangles, all controls
inside the viewport, minimum navigation/control height of 42 pixels, the
expected role-specific links and active Notifications state, and no emoji.
At 1280 pixels the header is one row; smaller widths wrap without clipping.

Evidence: `visual/viewport-checks.json` and the nine `<role>-<width>.jpg` files.
The Coordinator 320/640 and desktop views were visually inspected, as was the
Student desktop view. No layout defect was observed.

Inspected account forms for TA and Coordinator at all three widths: all form
controls remained in the viewport with no page overflow. Student profile wrong-
password feedback was inspected at 1280, 640 and 320 pixels with no overflow;
the focused password field stayed below the sticky header and within the
viewport. Evidence: `visual/form-checks.json`, role-account screenshots and
`visual/profile-password-error-<width>.jpg`.

## Feedback, keyboard, hover and state checks

- Submitted a synthetic profile edit to the mock failure endpoint. Observed
  exactly one "Your current password is incorrect. Please try again." next to
  Current password, aria-invalid=true, aria-describedby targeting the error,
  and focus on that input. There was no page-load Retry button.
- Edited the password input. The field error and aria-invalid cleared. The
  edited non-secret email remained visible in the screenshot. An attempted
  read-only DOM value-equality check returned false while the value attribute
  was unavailable; the screenshot clearly retained the edited address. That
  programmatic equality check is not used as preservation evidence.
- A separate mock AUTHENTICATION_REQUIRED response showed the session-expired
  message, focused its form alert, and offered Sign in with href `/`.
- Keyboard Tab from the brand focused Account. Read-only computed style showed
  a visible 3px focus outline and :focus-visible=true. Screenshot saved.
- Pointer hover over the Students link showed :hover=true, light-blue background
  rgb(239,246,255), and blue border rgb(29,78,216). Screenshot saved.
- Loading, empty, populated, failed-inbox, and failed mark-read views all kept
  the shared header; a direct reload retained it too. Populated view showed
  unread badge 3. None overflowed. Evidence: `visual/inbox-state-checks.json`
  and inbox-state screenshots. Manager retry and protected logout behavior
  are covered by the passing integration suites, not claimed as browser actions.

All browser interactions were through CUA; read-only DOM evaluation supplied
layout/ARIA measurements. Input and click actions used documented locators,
and the hover check used a pointer drag from a blank region. Screenshots contain
only synthetic content and masked synthetic password input. The preview tab
was closed and temporary viewport override reset; CUA completion was recorded.

## Outcome and limits

All performed visual checks passed; no new production corrections were needed.
This is UI verification against mocked responses, not a live backend or cloud
test. Existing server authorization and request semantics are covered by the
separate local unit/integration regression run. The browser's generic document
title remains its pre-existing Sign in title; title changes were outside scope.

User-facing preview: `visual/notifications-fixed.jpg` (1280 x 320 crop including
header, inbox heading and empty state). Profile proof:
`visual/profile-password-error-1280.jpg`.
