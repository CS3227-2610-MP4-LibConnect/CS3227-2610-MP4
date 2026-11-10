# Student ticket creation specification

Version: 0.3 (human-approved 2026-11-09; approval in conversation)
Task ID: `student-tickets`

## Purpose and scope

Allow an authenticated Student to start a help ticket from the Student dashboard
or the authenticated navigation header, submit the problem details, and return
to the dashboard with a success message after the server confirms creation.

This version covers ticket creation, including the creation-time optional code
files or repository reference described by `Overview.md`. The planned
`student-tickets` feature also includes editing, closing, viewing ticket
lists/details, and replies. Those later operations are deferred to separately
specified work; this specification does not authorize them. Ticket read APIs,
ticket detail routes, TA queue behavior, AI assistance, Bug FAQ, email/push
delivery, dependencies, deployment changes, and external services are out of
scope.

## Sources and assumptions

- `Overview.md` defines the Student ticket story and Ticket fields. A ticket
  belongs to its creator, starts in `OPEN`, and may contain title, language,
  concept tags, up to three small code files, a public GitHub reference and
  paths, error output, expected behaviour, actual behaviour, attempted work,
  status, and timestamps.
- The user requested an `Ask for Help` dashboard section and a `Create Ticket`
  action there and in the authenticated navigation; both open a create-ticket
  page. The user explicitly requires title, language, expected behaviour,
  actual behaviour, and attempted work.
- The user requested a success notification followed by dashboard navigation.
  This is interpreted as transient in-app confirmation visible on the
  destination dashboard. It is not a persisted `Notification` record: the
  approved Notification types do not include ticket-created, and that feature
  has no need to notify another user.
- Create route: `/student/tickets/new`; API: `POST /api/tickets`.
- Approved `role-aware-login` session rules and the current authenticated
  route guard provide the authorization pattern. `notifications` specifies
  that state-changing requests require CSRF. `Overview.md` requires shared
  login-page styling, reusable shared CSS, and responsive layouts.
- The create form includes the required fields above. `errorOutput`,
  `conceptTags`, and source context (up to three code files, or a public GitHub
  URL with relevant paths) are optional. A public repository URL is stored as
  a reference only; the server never fetches it. Files and a repository
  reference cannot be submitted together.
- `Overview.md` does not define size limits or a concept-tag input policy. The
  human approved policy recommendations for v0.2. The later shared ticket
  contract and its reconciliation proposal v0.3 were approved by the human
  on 2026-11-09 and supersede the conflicting v0.2 field names and limits.
- The shared contract specifies the `tickets/{ticketId}` document shape,
  Firestore `Timestamp` fields, initial null values, and state-machine
  compatibility. This creation task writes only the `(none) → OPEN` state.
  Reply documents and later transitions remain separately specified work.

## Actors and trust boundaries

- **Authenticated Student:** may create a ticket for their own verified account.
- **Authenticated TA:** cannot use the student ticket-creation route or API.
- **Visitor:** cannot access the create form or create endpoint.
- The server-validated session and current stored account are authoritative
  for identity, role, and active status. Client-supplied IDs, role, status,
  claimed-TA fields, and timestamps are untrusted and never authorize a write.
- Form text, filenames, code contents, repository URLs/paths, and API response
  bodies are untrusted data. Render user text as text, never as HTML. Do not
  fetch the submitted repository URL.
- Only trusted server code may read or write `tickets/{ticketId}` or its
  `replies` subcollection. The browser MUST NOT access either through a
  Firestore client SDK.
- Do not log ticket content, code, credentials, raw session identifiers, or
  CSRF tokens. Use synthetic content in tests and evidence.

## Requirements

### R1. Student dashboard entry points

- The Student dashboard MUST show an `Ask for Help` section with a
  `Create Ticket` link/button that opens `/student/tickets/new`.
- The authenticated header MUST show a `Create Ticket` navigation action for
  Students that opens the same route. The action MUST NOT be shown for TAs.
- Both entry points MUST preserve the shared application theme, clear focus
  indication, and responsive behavior. The dashboard section MUST not imply
  that a ticket has been created before a successful server response.

### R2. Protected create page

- Direct visits to `/student/tickets/new` MUST validate the cookie-backed
  session with the server before rendering the form. Only an active `STUDENT`
  session may render it.
- An unauthenticated visitor is redirected to sign-in using existing
  authenticated-route behavior. A TA receives a safe access-denied outcome and
  no ticket form or write capability.
- Reloading or directly entering the route MUST preserve the same session and
  role checks. Client path, browser history state, form values, and storage do
  not grant access.

### R3. Ticket form and client validation

- The form MUST provide labeled controls for `title`, `language`,
  `expectedBehaviour`, `actualBehaviour`, and `attempted`. Each is required;
  a value containing only whitespace is invalid. The client trims surrounding
  whitespace before submission but does not silently alter internal text.
- The form MUST expose optional controls for `errorOutput`, `conceptTags`,
  and source context. Source context follows the Overview model: up to three
  small code files with filenames and text contents, or a public GitHub URL
  with relevant paths. The form MUST allow at most one source method and
  enforce the R4 limits before submission. `language` MUST be selected from
  the fixed R4 list; manual language entry is not allowed. A short note below
  the selector MUST explain that a Student choosing `Other` can name the
  language in the title or another ticket detail. `conceptTags` are
  Student-entered free text, not a fixed vocabulary.
- Invalid required fields MUST show field-specific accessible feedback and
  MUST NOT send a request. While a request is pending, duplicate submission
  MUST be prevented and the pending state MUST be announced accessibly.
- User-provided text MUST be treated as plain text. The form MUST NOT execute,
  preview as HTML, or otherwise interpret ticket content.

### R4. Server-side ticket creation

The endpoint is `POST /api/tickets`.

- The endpoint MUST authenticate the current cookie-backed session and
  re-check that the stored account is active and has `accountType: STUDENT`.
  A TA or unauthenticated request MUST NOT create data.
- The endpoint MUST require the established CSRF header/token check for this
  state-changing request.
- The server MUST derive `studentId` from the authenticated account. It MUST
  ignore or reject client-supplied `studentId`, `ticketId`, `status`,
  `claimedByTaId`, `fixNote`, and timestamp fields; none may override server
  values.
- The server MUST validate the five required text fields independently of
  client validation. It MUST reject JSON bodies over 128 KiB (131,072 UTF-8
  bytes) with `413` and malformed JSON, wrong types, unknown fields, or
  invalid values with `400`. The request allowlist is `title`, `language`,
  `expectedBehaviour`, `actualBehaviour`, `attempted`, `errorOutput`,
  `conceptTags`, `files`, `repoUrl`, and `repoFilePaths`.
- After trimming surrounding whitespace, `title` MUST contain 1–255
  characters, and each of `expectedBehaviour`, `actualBehaviour`, and
  `attempted` 1–5,000 characters. Optional `errorOutput` MUST be at most
  5,000 characters. Internal text MUST remain unchanged.
- `language` MUST be exactly one of `Python`, `Java`, `JavaScript`,
  `TypeScript`, `C`, `C++`, or `Other`. The client MUST offer only these
  choices; the server MUST reject any other value, including a custom value.
- `conceptTags`, when present, MUST be an array of at most five strings.
  The client and server MUST trim and lowercase each tag, then reject blank
  or duplicate normalized tags. Each normalized tag MUST contain 1–30
  characters.
- `files`, when present, MUST be an array of at most three objects, each
  containing only `filename` and `content`. Each filename MUST be a nonempty
  basename of at most 120 characters, with no path separators or control
  characters and not equal to `.` or `..`. Each content value MUST be UTF-8
  text of at most 24 KiB (24,576 bytes).
- `repoUrl`, when present, MUST be an HTTPS `github.com` URL of at most 255
  characters, without credentials, query, or fragment. A repository reference
  MUST include `repoFilePaths`, an array of 1–10 nonempty relative paths.
  The total input length across all paths MUST be at most 5,000 characters.
  Paths MUST have no control characters, absolute prefix, or `.`/`..`
  segments. `repoFilePaths` MUST NOT appear without `repoUrl`. `files` and
  repository fields MUST NOT coexist. The server MUST store these values as
  references only and MUST NOT fetch the URL.
- On success, the server MUST create exactly one document at
  `tickets/{ticketId}` with the server-chosen document ID also stored as
  `ticketId`, authenticated `studentId`, validated create fields, `status:
  OPEN`, `claimedByTaId: null`, `fixNote: null`, and `resolvedAt: null`.
  `createdAt` and `updatedAt` MUST be server-written Firestore `Timestamp`
  values. Absent `files`, `repoFilePaths`, and `conceptTags` MUST be stored as
  empty arrays; absent `repoUrl` and `errorOutput` MUST be stored as `null`.
  The endpoint returns `201` with the created `ticketId` and only the
  minimum safe result needed by the client.
- The create write MUST be compatible with later state transitions and
  replies: only an owning Student creates `(none) → OPEN`; later `CLAIMED`,
  `RESOLVED`, and `CLOSED` transitions and the `replies` subcollection are
  outside this endpoint. This endpoint MUST NOT perform those transitions.
- Storage failure MUST return a safe `503` response and create no misleading
  client success state. The API MUST NOT create a persisted Notification for
  this action.

#### Shared ticket state compatibility

The shared C2 contract defines `OPEN`, `CLAIMED`, `RESOLVED`, and `CLOSED`.
`claimedByTaId` is a string only in `CLAIMED` and is `null` otherwise;
`fixNote` and `resolvedAt` are non-null only in `RESOLVED`. Creation writes
`OPEN` with those three fields `null`. Later operations, outside this task,
own `OPEN → CLAIMED` (any TA), `CLAIMED → OPEN` (claiming TA),
`CLAIMED → RESOLVED` (claiming TA), and `OPEN` or `CLAIMED → CLOSED`
(owning Student). `RESOLVED` and `CLOSED` are terminal, including for replies
and claim changes. The later operations must reject other transitions with
`409`, use Firestore transactions that re-read status and `claimedByTaId`,
update `updatedAt`, and clear `claimedByTaId` when the Student closes a
`CLAIMED` ticket. None of those later routes or writes are part of this
creation-only specification.

Reply documents, when a later task implements them, live at
`tickets/{ticketId}/replies/{replyId}` with `replyId`, `ticketId`,
`authorUserId`, `message`, and server-written Firestore `Timestamp`
`createdAt`. This task does not create or read replies.

### R5. Success, failure, and navigation

- After receiving a valid `201` response, the page MUST show a success message
  on `/student/dashboard` and navigate there. The message is transient,
  in-app feedback and is not an inbox notification. Any client navigation
  signal is presentation-only and MUST NOT be treated as authorization or
  evidence of server creation.
- On validation, authorization, CSRF, network, malformed-response, or storage
  failure, the page MUST remain on the form, show safe actionable feedback,
  preserve non-secret user-entered values where practical, and provide a retry
  path when retrying is meaningful. It MUST NOT show success or redirect.
- Raw server HTML, stack traces, ticket text, session values, and CSRF tokens
  MUST NOT be inserted into messages or logs.

### R6. Presentation and accessibility

- The create page MUST use the approved pale-blue, navy/blue, white-surface
  visual convention and shared project CSS/resources.
- Every field MUST have an associated visible label. Errors MUST be programmatically
  associated with fields, invalid fields MUST expose `aria-invalid`, and focus
  MUST move to or clearly identify the first invalid field after failed submit.
- Layout and controls MUST remain usable without horizontal overflow at a
  320 CSS-pixel viewport and support keyboard-only operation.

## Acceptance scenarios

1. Given a verified active Student on `/student/dashboard`, when the Student
   activates `Create Ticket` in `Ask for Help`, the protected create page opens.
2. Given a verified active Student, when the Student activates the header
   `Create Ticket` action, the same protected create page opens; a TA header
   does not expose that action.
3. Given no valid session, when `/student/tickets/new` is opened directly, the
   form is not rendered and the existing sign-in behavior is used.
4. Given a verified TA session, when the student create page or API is
   requested, access is denied and no ticket is written.
5. Given any required field is blank or whitespace-only, when the Student
   submits, the associated error appears and no request is sent.
6. Given valid required fields and optional accepted values, when the Student
   submits, the server stores one `OPEN` ticket owned by the authenticated
   Student at `tickets/{ticketId}`, with the C1 fields, Firestore `Timestamp`
   values, and null initial claim/resolution fields, then returns `201`.
7. Given the client includes a forged student ID, role, status, claimed TA,
   fix note, or timestamps, when the request is processed, those values cannot
   change the stored owner, initial status, or server timestamps.
8. Given a missing/invalid CSRF token, malformed body, invalid field, or
   oversized request, the server rejects the write and returns a safe error.
   This includes unknown fields, excess files or tags, forbidden file/path
   names, non-GitHub URLs, simultaneous source methods, and a language outside
   the fixed list.
9. Given storage or network failure, the form remains available with safe
   feedback; it neither redirects nor reports success.
10. Given a successful response, the Student returns to the dashboard and sees
    transient success feedback. No inbox Notification is created.
11. Given ticket text or filenames contain HTML/script-like strings, those
    strings are stored only as data and rendered literally wherever shown.
12. Given a public repository URL is submitted, the server stores the URL and
    paths as references and makes no network request to that URL.
13. Given a 320 CSS-pixel viewport or keyboard-only use, the form controls,
    validation feedback, and submit action remain reachable and usable.
14. Given `Other` is selected, the language value remains `Other`, the form
    displays the explanatory note, and any specific language is supplied only
    through another ticket text field.
15. Given uppercase or padded concept tags, the client and server store
    lowercase trimmed tags, reject duplicates after normalization, and cap
    the array at five.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Dashboard/header UI | Student-only entry points, route destination, shared styles, keyboard/focus behavior, TA absence |
| Protected routes | Direct entry, refresh, unauthenticated redirect, TA denial, no form during session check |
| Form | Fixed language selector and `Other` note; required/whitespace and approved limit validation; five-tag normalization; exclusive source methods; optional inputs; duplicate-submit prevention; accessible errors and pending state; preservation on failure |
| API | Student identity derived from session, TA/visitor denial, CSRF, exact create-field allowlist, fixed language and typed limits, malformed/oversized body rejection, safe status codes |
| Persistence | One C1-shaped `OPEN` document at `tickets/{ticketId}`, correct owner, Firestore `Timestamp`s, null initial claim/resolution fields, empty optional representations, no client-controlled state, failure/no-write behavior |
| Boundaries | No browser Firestore writes, no repository fetch, no persisted create notification, literal rendering of untrusted text |
| Responsive | Keyboard-only and visual inspection at 320 CSS pixels using synthetic fixtures |

All verification MUST use synthetic local data and the Firestore emulator when
storage integration is needed. Production data, credentials, and external
services are not needed or authorized.

## Policy decisions and shared-contract reconciliation

The human approved v0.2's four recommendations in `policy-proposal.md` on
2026-11-09, then separately approved specification v0.2. The human later
supplied shared contract C1/C2, clarified the fixed language list and limits,
restored C1's five-tag maximum, and approved
`shared-contract-reconciliation.md` v0.3, including its aggregate
`repoFilePaths` limit, tag normalization, and empty-value representation.
This v0.3 specification records those changes. The human separately approved
it on 2026-11-09.

## Amendments

- 2026-11-09: Drafted for human review after the task ID `student-tickets` was
  confirmed. This draft covers only the requested create flow; remaining
  planned ticket operations stay deferred.
- 2026-11-09: Proposed v0.2 amendment after the human approved the four
  `policy-proposal.md` recommendations. Added request and field limits,
  filename/path and URL rules, exclusive source methods, and free-text concept
  tags.
- 2026-11-09: The human separately approved amended specification v0.2 in the
  conversation. Checklist, handoff, batch plan, and implementation dispatch
  remain separate approval gates.
- 2026-11-09: Proposed v0.3 after the human approved shared-contract
  reconciliation v0.3. Aligned stored field names and complete C1 shape,
  fixed language selector, five normalized tags, revised text limits,
  Firestore `Timestamp` and null/empty values, and C2 create compatibility.
  No later ticket operations were added.
- 2026-11-09: The human separately approved specification v0.3 in the
  conversation. Amended checklist, handoff, batch plan, and implementation
  dispatch remain separate approval gates.
