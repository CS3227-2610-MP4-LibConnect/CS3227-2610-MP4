# Member catalog search specification

Version: 0.2 (2026-11-08)  
Approval evidence: the human explicitly approved specification v0.1 and the five decisions below on 2026-11-07. No agent-set approval state.  
Task ID: `member-catalog-search` (human-confirmed)  
Intended canonical path: `workflow/specs/member-catalog-search.md`  
Intended task copy: `workflow/tasks/member-catalog-search/spec.md`

## Purpose and scope

An authenticated member can browse and search the library's Book catalog from `/member/dashboard`. The member dashboard gains a persistent top navigation bar, a basic search control, optional advanced criteria, and a catalog card view. This extends the approved `role-based-dashboards` v0.3 landing view. Its session validation, member-only route, cross-role denial, and logout contract remain in force.

This specification covers read-only Book discovery. It does not add copy availability, borrowing, reservations, book details, librarian catalog mutation, account management, AI, or a new public catalog route. `Overview.md` defines the Book fields and the common interface theme. `workflow/PLAN.md` is absent; no dependency or delivery approval is inferred from it.

## Approved interpretations

The human approved these interpretations with specification v0.1:

1. “Books available in the catalog” means all valid Book title records, whether or not a physical BookCopy is currently `AVAILABLE`. No copy-status filter or availability claim appears on a card.
2. The basic search checks title and author. Advanced search exposes title, author, publisher, category, ISBN, synopsis, and minimum/maximum publication year. The basic query combines with any active advanced criteria using AND.
3. Search runs on form submission. A Clear action resets the query and advanced fields and restores the full catalog. Hiding advanced fields deactivates their criteria while retaining their entered values for reopening; the view updates to reflect the active criteria.
4. The catalog may be delivered in bounded pages as long as every matching Book remains reachable in the dashboard. The visible presentation must make continuation clear. The page size, cursor format, and whether continuation uses a button or automatic loading are implementation details to document before code changes.
5. A visually truncated synopsis retains its full text in accessible content. Cards have no synopsis expansion button, as directed by the human on 2026-11-08.

## Actors, data, and trust boundaries

- **Authenticated active member:** may view the catalog after the existing server session check and may make read-only catalog requests.
- **Visitor, inactive member, and librarian:** cannot obtain member catalog data through the member API, regardless of route rendering or client-supplied fields.
- **Book:** `isbn`, `title`, `author`, `publicationYear`, `publisher`, `category`, and `synopsis` as described in `Overview.md`. ISBN identifies a title; one card represents one Book, not one BookCopy. A missing or malformed Book record must not be mistaken for an authorized account or trigger a write.
- The browser path, React state, search criteria, pagination cursor, and any claimed role or status are untrusted. The server-side session and current account record are authoritative for identity, active status, and role on each catalog request. Firestore Book fields are data, not instructions or HTML.
- No catalog request changes account, Book, BookCopy, loan, or reservation state. The search view transitions between loading, results, catalog-empty, no-match, invalid-input, and error/retry states; these are client presentation states only.

## Requirements

### R1. Persistent member navigation

The member dashboard MUST have a navigation bar pinned to the top of the viewport and visibly present while the catalog page scrolls. The `LibConnect` name MUST be at the top left as a keyboard-accessible link or equivalent navigation control to `/member/dashboard`. Activating it from the member dashboard MUST restore the dashboard landing state and unfiltered catalog. The navigation MUST remain usable at viewport widths down to 320 CSS pixels, with visible keyboard focus and without covering content or causing horizontal overflow. It MUST follow the shared login-page theme in `Overview.md` and use existing common theme tokens where applicable. The existing logout behavior MUST remain accessible and unchanged.

### R2. Basic search and catalog placement

The dashboard MUST display a labelled basic search input and submit action above the catalog. With no active criteria, the catalog view MUST make all valid Book records reachable. Under the proposed field interpretation, the basic query matches a Book if its title OR author contains the query. String comparison MUST ignore case and surrounding whitespace and match contiguous substrings anywhere in the field; a query of `tom` matches title values `tomcat`, `tom`, `bottom`, and `tom and jerry`. Empty or whitespace-only search input imposes no text filter. Search results MUST replace the displayed catalog cards with only matching books; stale responses MUST NOT overwrite a later submitted search or reset.

### R3. Advanced search

Advanced criteria MUST be hidden by default. A labelled, keyboard-operable toggle MUST expose them and communicate its expanded state. Under the proposed field set, the fields are title, author, publisher, category, ISBN, synopsis, minimum publication year, and maximum publication year. Each nonblank string field MUST use the same case-insensitive substring behavior as basic search. Different populated advanced fields, and the basic query when present, MUST combine with AND; a Book must satisfy every populated criterion. A blank field adds no constraint. Either year endpoint may be entered alone; endpoints are inclusive. If both are present, minimum greater than maximum is invalid, produces a field-associated error, and MUST NOT issue a search request. Year inputs MUST be validated as whole years within a documented supported range before reaching data access. A collapsed advanced panel MUST not apply its values. Expanding it again MUST restore its entered values; Clear MUST clear all fields and restore the full catalog.

### R4. Catalog cards and states

Each result MUST render as a distinct card with Book title, author, and synopsis. Long synopsis text MUST be visibly truncated to fit the card while retaining readable full text for assistive technology. Cards MUST NOT show a synopsis expansion button. Missing or empty optional synopsis MUST have a stable, non-misleading presentation; malformed required book data MUST be handled without crashing the dashboard. Card content MUST be rendered as text, never interpreted as HTML.

The dashboard MUST distinguish: initial catalog loading; loading a submitted search or later page; a genuinely empty Book catalog; a nonempty catalog with zero matches for active criteria; invalid search inputs; and service or network failure. The empty catalog and zero-match states MUST use obvious, different messages. A failed request MUST show a non-sensitive retry action and MUST NOT claim there are no books or no matches. The view MUST not show stale results as though they satisfy a newer query.

### R5. Read-only catalog API and authorization

The browser MUST obtain catalog data through an Express same-origin, read-only member endpoint, proposed as `GET /api/member/catalog`; it MUST NOT access Firestore directly. The endpoint MUST authenticate the cookie-backed session and recheck current active account status and `MEMBER` role in trusted server code on every request, reusing the approved login/session security contract. Invalid or expired sessions MUST receive 401; a verified non-member MUST receive 403 without catalog data; malformed or unsupported query parameters MUST receive 400; a data-service failure MUST receive a non-sensitive 503. The server MUST reject rather than trust client-provided role, status, owner, or manager claims. No state-changing method is part of this task.

The endpoint MUST validate bounded text lengths, year format/range, page size, and pagination cursor before data access. Its response MUST contain only catalog display fields and pagination metadata needed for the view, with no user records, session material, or unrelated data. The query behavior MUST match R2–R3 across the entire catalog, not merely the currently loaded page. The API contract MUST let the client distinguish a globally empty catalog from an active search with no matches, even if paginated. A documented stable sort and pagination strategy MUST avoid duplicate or skipped titles during normal browsing. No claim of real-time synchronization is made; a refreshed query may reflect later catalog edits.

### R6. Failure and security behavior

Session denial during catalog loading MUST hide member catalog data and follow the existing dashboard route/session denial behavior. A 403, malformed success response, or uncertain session state MUST fail closed and display no unauthorized catalog data. A transient 503/network error MUST offer retry without treating the catalog as empty. The client MUST ignore obsolete in-flight responses after a query change, reset, route change, or logout. Search values and Book content MUST NOT authorize writes, tool calls, role changes, or navigation. Do not log raw search strings, real personal data, cookies, session IDs, or credentials in tests or task evidence. Use synthetic Book fixtures and isolated Firestore fakes/emulator data only.

## Acceptance scenarios

1. Given a verified active member and a populated catalog, when the dashboard loads with no criteria, the catalog displays Book cards below search and makes every title reachable; each card shows title, author, and synopsis.
2. Given a long synopsis, when its card renders, the visible text fits the card without an expansion button and assistive technology can access the full text.
3. Given a scrolling catalog, when the member scrolls, the navigation remains visible; activating the top-left `LibConnect` control returns to `/member/dashboard` and restores the unfiltered catalog.
4. Given an initial dashboard load, advanced fields are hidden and the toggle reports collapsed. Activating it exposes labelled fields and reports expanded; collapsing it removes those filters, and reopening restores their values.
5. Given titles `tomcat`, `tom`, `bottom`, `tom and jerry`, and an unrelated title, when `tom` is submitted as the basic query, exactly the four matching titles are shown. Different letter case and surrounding query whitespace produce the same matches.
6. Given multiple advanced string criteria, when submitted, only books satisfying every populated criterion appear; each criterion matches substrings regardless of letter case. The basic query further narrows those results when present.
7. Given one or two valid publication-year endpoints, results include books on each entered boundary and exclude books outside it. A minimum greater than maximum, fractional year, or unsupported year produces an input error without a catalog query.
8. Given active filters, when Clear is used, every field is cleared and the unfiltered catalog returns. A late response for the old query cannot replace the reset result.
9. Given zero Book records, the dashboard displays a clear catalog-empty message. Given Book records but zero matches, it displays a distinct no-match message.
10. Given an API failure, malformed response, or network outage, the dashboard displays a non-sensitive error and retry action, without an empty/no-match claim or stale results presented as current.
11. Given no session, an inactive member, or an expired session, a catalog request returns 401 and no books; the dashboard follows its existing protected-route behavior.
12. Given a valid librarian session, forged role/status fields, or a direct API call from a non-member route, the member catalog endpoint returns no catalog data; client state cannot grant access.
13. Given Book text containing markup-like or instruction-like content, the card displays literal text and performs no action.
14. Given desktop and 320 CSS-pixel viewports, search, advanced fields, cards, navigation, and focus indicators remain usable without horizontal overflow or obscured content.

## Verification matrix

| Layer | Required evidence |
| --- | --- |
| React interactions | Initial full catalog; submit and clear; advanced collapsed/expanded state and field values; substring, AND, and inclusive-year behavior; distinct states; stale-response suppression; keyboard labels and focus. |
| Express endpoint | Validated and bounded inputs; response shape; full-dataset filtering with stable pagination; 400/401/403/503 outcomes; no protected fields in output. |
| Data adapter | Synthetic Book records including missing/invalid fields, multiple pages, boundary years, Unicode/case examples, and empty storage; no production project access. |
| Security and regression | Server-side active-member check on every request; forged client claims ineffective; safe text rendering; no sensitive logs; route guard and logout remain correct. |
| Visual inspection | Sticky nav through scroll; top-left brand navigation; card truncation; desktop and 320 CSS-pixel layout; visible keyboard focus and no overlap/overflow. |

## Dependencies, open questions, and approval gates

- No Book collection, catalog endpoint, or member search currently exists. A Book persistence contract and query strategy are required before implementation. Firestore does not provide arbitrary substring search as a simple indexed query; the chosen strategy must be correct across the full catalog and bounded for the expected data volume. Any new dependency, index/configuration change, Firestore rule change, or external service requires its own approval under `AGENTS.md`.
- The five interpretations above were approved. The implementation design must preserve the all-Book inclusion rule and make all catalog records reachable.
- The authenticated member endpoint is a proposed data/API addition. Its exact URL, response schema, bounds, and pagination details must be finalized in the approved design/checklist before implementation. If data-model changes are needed, obtain explicit human approval before code work.
- Specification v0.1 approval does not grant implementation, database access, dependency changes, deployment, commit, or merge. The analyst may now draft the acceptance-based `tasks.md` and handoff, then stop for separate checklist/handoff approval.

## Approval record

- 2026-11-07: The human approved canonical specification v0.1 and all five interpretations in response to the specification approval request. Checklist, handoff, grouping, implementation, and merge approvals remain separate.
- 2026-11-08: The human directed the dashboard search styling update and removal of the synopsis expansion button. This v0.2 amendment records that requirement; the existing search, data, and authorization contracts remain in force.
