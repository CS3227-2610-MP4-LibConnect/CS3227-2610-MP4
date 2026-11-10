# Implementation report: T02 — Shared ticket card and Student navigation

Status: **complete** for assigned T02 scope. Independent review remains pending.

## Contract and coverage

Extracted the dashboard card markup into `StudentTicketCard` and reused it from the dashboard. The shared card preserves the existing title, language/status, tags-or-**No concept tags** order, detail link, and dashboard CSS/focus treatment. It supports all four readable status labels and a muted terminal-card modifier for the My Tickets page to use. Added **My Tickets** directly after **Create Ticket** for Students, with `aria-current="page"` at `/student/tickets`; the TA navigation excludes it.

The dashboard retains its five-ticket response limit and the existing **View all tickets** label and `/student/tickets` destination. That wording was already an uncommitted user edit when work began; it is preserved.

Evidence covers card content order and status labels for all four statuses, empty-tag text, detail link encoding, muted-card focusability, Student nav order/current indicator, TA exclusion, existing dashboard link, and dashboard five-ticket behavior.

## Changed files

- `src/codeclinic/src/AppHeader.tsx`
- `src/codeclinic/src/StudentDashboard.tsx`
- `src/codeclinic/src/tickets/StudentTicketCard.tsx`
- `src/codeclinic/src/tickets/StudentTicketCard.css`
- `src/codeclinic/test/StudentTicketCard.test.tsx`
- `src/codeclinic/test/StudentTicketActivity.test.tsx` (aligned its assertion with the approved dashboard wording)

## Verification

`npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentTicketCard.test.tsx test/AppHeader.test.tsx test/StudentTicketActivity.test.tsx test/StudentTickets.test.tsx` — **pass**, 4 suites and 39 tests. Exact captured output: [implementation-T02.md](../../../logs/tasks/student-my-tickets/implementation-T02.md).

An earlier filtered run failed only because `fireEvent.focus` did not focus the anchor in jsdom; changing the test to call `.focus()` fixed the check. The final run passed. Jest reported existing asynchronous React `act(...)` console warnings from NotificationBell and StudentDashboard tests, plus the Node `punycode` deprecation warning; there were no assertion failures.

The focus-visible styling is retained through the shared dashboard card class. Rendered contrast and responsive layout are reserved for the separately specified human 320 CSS-pixel check in T04.

## Deviations and risks

No product, data-model, or authorization changes were made. The OpenSpec CLI limitation is recorded in the T01 report; the approved repository adapter and manifest were used. The local Firestore index is not deployed, and no live service was accessed. Runtime token metrics: unavailable.
