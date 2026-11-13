# Bug FAQ specification

Version: 0.4 approved (2026-11-12)
Task ID: `bug-faq` (named in the delivery plan and the human's request)
Approval evidence: v0.3 was approved on 2026-11-12. When T01 exposed the missing FAQ-reference strategy, the human chose session-bound references and approved `workflow/tasks/bug-faq/reference-amendment-proposal.md` on 2026-11-12. The human explicitly approved specification v0.4, checklist, handoff, batch plan, and Batch 1 dispatch on 2026-11-12. The v0.3 implementation dispatch is obsolete for v0.4.

## Purpose and scope

Let an authenticated Student search tickets created by any Student **only when the stored status is exactly `RESOLVED`**. Add the Bug FAQ section to `/student/dashboard` below **Ask for Help**. Keep the dashboard's content order **Active Tickets → Ask for Help → Bug FAQ** (after the existing welcome panel). The search has one text input and an explicit **Title** or **Tags** selector. Search cards display only title and concept tags; opening a result displays title, tags, the TA's fix note, and the conversation.

This is a read-only Student feature. It does not change ticket creation, status transitions, ownership of full ticket details, TA resolution, the owner-scoped My Tickets list, AI, notifications, or account management. Bug FAQ results do not link to the existing owner-only ticket detail route.

## Source reconciliation

- The human corrected the earlier v0.1 Bug FAQ scope: Student-closed `CLOSED` tickets are not searchable; only TA-`RESOLVED` tickets are. In the existing state machine, `CLOSED` means a Student closed an `OPEN` or `CLAIMED` ticket without a TA fix note; `RESOLVED` means a TA saved a fix note. The My Tickets **Closed** view includes both terminal statuses, but the Bug FAQ includes only `RESOLVED`.
- The human chose title and tags on search cards, and an explicit **Title or Tags** search selector on 2026-11-12. The human later requested that opening a result show the fix note and conversation, with speakers labelled **Student** and **TA**. Names typed inside messages may remain visible.
- The older documents received coordinated wording amendments after v0.1 approval. This specification does not change either terminal status or the state machine.

## Actors, data, and trust boundaries

- Only a current, active `STUDENT` account with a valid cookie-backed session and no required password change may use the FAQ API. The server verifies the stored account on every request. A visitor, TA, inactive Student, or Student required to change a temporary password receives no results.
- The trusted ticket status comes from stored Firestore data. A requested status, role, owner, ticket ID, or cursor never authorizes a read. The query itself must constrain status to `RESOLVED`; the server also checks each returned document before projection.
- Ticket title, tags, fix note, and reply text are user-authored and remain untrusted. Render them as literal text. An opened result may contain names or other identifying information typed in these fields; only speaker labels are masked. The FAQ returns a **limited projection**, not a guarantee that content is anonymous. Do not return code/file attachments, error output, behaviour fields, attempted fixes, repository links or paths, account data, owner ID, claim ID, raw document, or raw ticket/reply IDs.
- Only trusted server code reads tickets. Do not log search terms, ticket content, session identifiers, credentials, or private account data. Use synthetic tickets in tests and evidence.
- Every externally returned Bug FAQ token (`faqRef`, search continuation cursor, and reply continuation cursor) is stateless, session-bound authenticated encryption. Derive an AES-256-GCM key with HKDF-SHA-256 from the server-authenticated session's `idHash`, using a fixed, domain-separated CodeClinic Bug FAQ context. Generate a fresh nonce for every token. Authenticate the current Student ID and token purpose as associated data; also bind search cursors to normalized query and field, and reply cursors to their FAQ reference. Encrypt all ticket/reply identifiers and cursor payloads so the base64url token does not reveal raw IDs. Do not use a process-local random key or persist token mappings. A token must fail safely in another session, including another session for the same Student, and after logout/session rotation. No new database model, configured secret, or live deployment is introduced.

## Requirements

### R1. Dashboard search and results

- On the verified Student dashboard, render the Bug FAQ section immediately after **Ask for Help**. The existing Active Tickets and Ask for Help sections, their links, and their behavior remain intact. The TA dashboard has no Bug FAQ section.
- Provide a labelled search input, a keyboard-operable selector with **Title** and **Tags**, and a **Search** submit action. The selected field is programmatically exposed. Default to **Title**. A submission trims surrounding whitespace; an empty submission shows a useful validation message and makes no API request.
- Match is case-insensitive contiguous substring search in the chosen field. **Title** searches ticket titles; **Tags** matches if any concept tag contains the query. Internal spaces are significant. Do not search ticket body, replies, files, or fix notes. Return results in descending `createdAt` order, using the ticket document ID as a stable tie breaker.
- A search card shows only its title and concept tags, or **No concept tags**. Opening it displays the title, tags, fix note, and conversation in a read-only FAQ detail view. Conversation speakers are labelled **Student** or **TA** based on server-derived roles; names typed in message bodies remain visible. This view is not the owner-only detail page and has no posting or ticket modification actions. The UI must not display author identity. Changing the query or field clears prior results and pagination state. A late response from an older search must not replace newer results.
- Distinguish initial idle state, searching, no matches in the scanned batch, more tickets to scan, exhausted search, and request failure with retry. A failed request must never appear as a complete empty result. Support continuation until all matching `RESOLVED` tickets are reachable. If a batch has no matches but more `RESOLVED` tickets remain, explain that and offer **Search more**.
- Match the existing dashboard theme. At 320 CSS pixels, controls and result cards remain readable without horizontal overflow and have visible keyboard focus. Announce loading, result, and error changes accessibly.

### R2. Protected, bounded FAQ API

- Add `GET /api/tickets/faq?q=<text>&field=title|tags&cursor=<opaque>` under the existing tickets router, before the `/:ticketId` route. `q` and `field` are required; `cursor` is optional. Reject unsupported, repeated, malformed, overlong, or empty-after-trim values with `400` before a ticket read. Bound the query to 1–100 Unicode code points and the cursor to a documented maximum length.
- Authenticate and recheck the current stored Student account before any ticket query. Use `401` for missing or invalid session and inactive/missing account, and `403` for wrong role or required password change, consistent with existing Student ticket APIs. Every success and error response has `Cache-Control: no-store`.
- The Firestore query must constrain `status == RESOLVED`, order by `createdAt` descending and document ID ascending, and read at most 100 ticket documents per request. Search the selected field on the server within that bounded batch. Return at most 20 matching projections and, if more resolved documents may remain, a bounded encrypted `nextCursor` bound to the normalized query and field. The cursor must represent the last examined document so that no matching document is skipped. Decrypt and validate the cursor using the current authenticated session before a ticket read; reject invalid, tampered, expired, cross-session, or cross-search use with `400`.
- The response is a typed `{ tickets, nextCursor? }` object. Each result contains `title`, `conceptTags`, and a bounded encrypted `faqRef`; the UI renders only the title and tags. The reference must not reveal a raw ticket ID and is bound to the authenticated Student's current session. A malformed stored document is skipped safely; it must never be emitted with a non-`RESOLVED` status or extra fields. A storage failure returns a generic `503` without raw error details.
- Add the required composite Firestore index configuration for the status/order query if the existing indexes do not cover it. Record the exact query and index shape in the implementation evidence. Any live index deployment is a separate external approval gate.

### R3. Protected, read-only FAQ detail

- Add a dedicated `GET /api/tickets/faq/:faqRef` endpoint. Validate reference shape and bounds, then authenticate/decrypt it using the current session's server-side `idHash` and authenticated Student ID before a ticket read. Reauthenticate and reload the active Student account, resolve the encrypted reference server-side, and recheck the ticket's stored status is exactly `RESOLVED` on every request. Never accept ticket ID, owner ID, role, or status from the client as authorization.
- Return `Cache-Control: no-store` on success and error. Invalid, expired, unauthorized, or no-longer-resolved references return a safe generic not-found response; storage failures return a generic `503` without ticket content.
- Return exactly `{ title, conceptTags, fixNote, replies, nextCursor? }`. Replies contain only `{ speaker: "Student"|"TA", message, createdAt }`; derive speaker from trusted stored ownership/TA author identity and do not return names, IDs, or other author fields. Preserve message text literally, including names typed by a speaker. Bound each reply page (maximum 50) and use a session-bound encrypted cursor that cannot change ticket identity or FAQ reference. The server must verify every reply belongs to the resolved ticket before projection.
- The detail view is read-only. It has back/navigation controls but no route or action that allows viewing as the ticket owner, posting a message, editing ticket data, or exposing raw identifiers.

## Acceptance scenarios

1. On `/student/dashboard`, the sections appear in the requested order, and Title is the default search field. Searching for ` loop ` finds a `RESOLVED` title containing `Loop` regardless of case; switching to Tags searches tags alone.
2. Results from multiple Students may appear, but only when their stored status is exactly `RESOLVED`. `OPEN`, `CLAIMED`, and `CLOSED` tickets with identical titles or tags never appear. Neither a forged status parameter nor a cursor can widen this set.
3. Search cards expose only title and tags. Opening a card shows title, tags, fix note, and paginated conversation. Speaker labels are **Student** or **TA**; names typed in message bodies remain visible. The response exposes no account names, IDs, code, error output, repository reference, or raw document. Special characters render literally.
4. More than 100 resolved tickets, including batches with zero matches and matches at page boundaries, remain searchable through continuation without skipped or duplicated results. FAQ references and cursors work across server instances only within the originating authenticated session; another session, including one for the same Student, cannot reuse them. Tokens fail after session end or rotation. Switching query or field during an in-flight request never mixes results.
5. Visitor, TA, inactive Student, and password-change-required accounts cannot retrieve FAQ data. Bad input/cursors and storage failures return safe responses without ticket content.
6. The search and read-only detail view work with keyboard only, communicate loading/empty/error/continuation states, retain visible focus, and have no horizontal overflow at 320 CSS pixels after the required human rendered check.

## Verification matrix

| Layer | Required evidence |
| --- | --- |
| Store | Status-constrained bounded search; stable ordering and cursor boundary; case-insensitive matching; safe projection; detail lookup and bounded replies; malformed data handling; index shape |
| API/security | Session and stored-account checks; all four statuses; forged status/role/owner input; authenticated-encryption token opacity and tamper handling; same-session acceptance and cross-session/logout/rotation rejection; search and detail reference validation; no-store and safe `503`; no cross-search or cross-ticket cursor reuse; speaker roles derived on server |
| UI | Section order; selector, validation, continuation and retry; card-to-detail navigation; fix note and conversation; stale-response handling; literal rendering; no author names/IDs in speaker metadata |
| Integration | Synthetic multi-owner tickets across all statuses and multiple search/reply pages; focused tests and production build |
| Accessibility/visual | Keyboard and screen-reader states; human browser check at `/student/dashboard`, 320 CSS-pixel viewport, including overflow and visible focus |

## Approval boundaries and open risks

- The human approved v0.2 and instructed continuation of the detail amendment. The human approved v0.3 on 2026-11-12. Batch approval, implementation, index deployment, and merge remain separate gates.
- Cross-owner title/tag/fix-note/message disclosure is a new authorization policy. User-authored content may contain personal or sensitive text, and names typed in messages may remain visible by explicit direction. Speaker-label replacement does not fully anonymize the content.
- A bounded scan avoids a new searchable data field and ensures every matching resolved ticket is eventually reachable, but sparse matches can require multiple **Search more** actions. The index may need deployment before production can serve the query.

## Amendments

- 2026-11-12: The human corrected v0.1 after test preparation: only stored `RESOLVED` tickets may be searched; Student-closed `CLOSED` tickets are excluded. The human approved `workflow/tasks/bug-faq/status-amendment-proposal.md` and this v0.2 specification. Title/Tags search, title/tag-only projection, and dashboard placement are unchanged.
- 2026-11-12: Draft v0.3 after the human requested fix note and conversation in opened FAQ results, with server-derived **Student**/**TA** speaker labels. The human confirmed that names typed in messages may remain visible and instructed continuation. Search cards remain title/tag-only; v0.3 was approved by the human on 2026-11-12.
- 2026-11-12: Draft v0.4 after T01 found that v0.3 did not define durable opaque-reference resolution. The human chose session-bound references and approved `workflow/tasks/bug-faq/reference-amendment-proposal.md`. v0.4 specifies stateless session-bound authenticated encryption for FAQ references and both continuation cursors, with no new persistence or configured secret. The human approved specification v0.4, checklist, handoff, batch plan, and Batch 1 dispatch on 2026-11-12.
