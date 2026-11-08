# CodeClinic MP4 Overview

This overview is the product-level scope for the MP4 implementation. Detailed
acceptance scenarios belong in approved specifications under `workflow/specs/`.
Workflows remain in the workflow documents rather than being duplicated here.

## Application context

CodeClinic is a course help desk where AI coaches students and helps TAs,
without doing the work for them. Students in programming courses submit coding
problems as tickets. TAs claim, answer, and resolve them. AI gives hints rather
than full solutions. Resolved tickets become a searchable, course-specific Bug
FAQ.

CodeClinic is designed for course-sized code such as labs and assignments, not
large production codebases.

The application has two account types: **Students** and **TAs**. A TA may
additionally have manager privileges, making them a **TA Coordinator** who
administers TA accounts. It is developed using **React with TypeScript** for the
frontend, **Express.js** for the backend, and **Firestore** for data storage.

The application includes bounded LLM features for each account type, using the
required SoC LLM through the server. AI output is advisory and does not replace
server authorization or human approval.

Features marked *optional* are implemented only if time allows. They must not
block delivery of the core features.

## User stories

### New user

- As a **new user**, I want to register for a student or TA account so that I
  can access the features available to that account type.

### Student

#### Tickets

- As a **student**, I want to create a help ticket with my code, error output,
  expected and actual behaviour, and what I tried, so that a TA understands my
  problem.
- As a **student**, I want to attach up to three small code files, or a public
  GitHub link with file paths, so that the TA can see the relevant code.
- As a **student**, I want to edit or close my own open tickets.
- As a **student**, I want to view my tickets and their status so that I know
  whether a TA is helping.
- As a **student**, I want to reply in my ticket's thread so that I can answer
  the TA's questions.

#### Bug FAQ

- As a **student**, I want to search resolved tickets by error or concept so
  that I can fix common problems myself.

#### AI assistance

- As a **student**, I want an AI Error Explainer to explain my error, name the
  concept involved, give hints without a full solution, and suggest a clearer
  version of my ticket.

#### Session requests (optional)

- As a **student**, I want to request a live help session for a ticket, with
  preferred times and format, and view, edit, or cancel that request.

#### Account management

- As a **student**, I want to update my name, email address, and password so
  that my account details stay current.

### TA

#### Ticket queue

- As a **TA**, I want to view the ticket queue and filter it by language,
  concept, and status so that I can choose what to help with.
- As a **TA**, I want to claim or unclaim a ticket so that students and other
  TAs know who is helping.
- As a **TA**, I want to reply in a ticket's thread.
- As a **TA**, I want to resolve a ticket with a short fix note so that the
  solution can appear in the Bug FAQ.

#### AI assistance

- As a **TA**, I want an AI Fix Note Drafter to draft a resolution note from the
  ticket and its thread, which I edit and confirm before saving.
- As a **TA**, I want AI Queue Insights to group open tickets by concept or
  misconception so that I know what to re-teach.

#### Session requests (optional)

- As a **TA**, I want to approve or decline session requests, setting the time
  and venue or link, and later reschedule or cancel approved sessions.

#### Student account support

- As a **TA**, I want to view student accounts and update their account status
  so that I can activate or deactivate accounts when needed.
- As a **TA**, I want to help a student reset their password so that they can
  regain access to their account.

#### Account management

- As a **TA**, I want to update my name, email address, and password so that my
  account details stay current.

### TA Coordinator

A **TA Coordinator** is a TA with additional account-management permissions.

Manager privilege is server-controlled through `isManager`; it is not a public
registration choice. A master coordinator account activates newly registered TA
accounts, which are inactive until activation.

#### TA account support

- As a **TA Coordinator**, I want to view TA accounts and update their account
  status so that I can activate or deactivate TA accounts as needed.
- As a **TA Coordinator**, I want to help a TA reset their password so that they
  can regain access to their account.

## Data model

The classes below describe the main data entities. Field types and validation
rules should be defined in the implementation or a separate technical
specification.

### Ticket

A **Ticket** represents one student's coding problem, identified by its
`ticketId`.

- `ticketId`: unique identifier for the ticket
- `studentId`: identifier of the student who created the ticket
- `title`: short summary of the problem
- `language`: programming language of the code
- `conceptTags`: concepts the problem relates to, such as recursion or merge
  conflicts
- `files`: up to three small code files, each with a file name and content
- `repoUrl`: optional public GitHub link, stored as a reference only
- `repoFilePaths`: optional relevant file paths within `repoUrl`
- `errorOutput`: error message or failing output
- `expectedBehaviour`: what the student expected to happen
- `actualBehaviour`: what actually happened
- `attempted`: what the student already tried
- `status`: current status of the ticket; one of:
  - `OPEN`: waiting for a TA
  - `CLAIMED`: a TA is helping
  - `RESOLVED`: a TA resolved the ticket with a fix note
  - `CLOSED`: the student closed the ticket without a resolution
- `claimedByTaId`: identifier of the TA who claimed the ticket, if any
- `fixNote`: TA-confirmed resolution note, set when resolved
- `createdAt`, `updatedAt`, `resolvedAt`: timestamps

Only the ticket's student and TAs may read a ticket. The Bug FAQ shows only an
anonymised view of resolved tickets.

### Reply

A **Reply** is one message in a ticket's thread.

- `replyId`: unique identifier for the reply
- `ticketId`: identifier of the ticket
- `authorUserId`: identifier of the student or TA who wrote it
- `message`: reply text
- `createdAt`: date and time the reply was created

### Session request (optional)

A **SessionRequest** asks for live help with one ticket.

- `requestId`: unique identifier for the request
- `ticketId`: identifier of the related ticket
- `studentId`: identifier of the requesting student
- `preferredTimes`: the student's preferred time slots
- `format`: `ONLINE` or `IN_PERSON`
- `status`: one of `PENDING`, `APPROVED`, `DECLINED`, or `CANCELLED`
- `scheduledDateTime`: date and time set by the approving TA
- `venueOrLink`: venue or meeting link set by the approving TA
- `decidedByTaId`: identifier of the TA who approved or declined

### Notification

A **Notification** represents a ticket-related message for a user.

- `notificationId`: unique identifier for the notification
- `recipientUserId`: identifier of the intended recipient
- `notificationType`: category of notification; one of:
  - `TICKET_CLAIMED`: a TA claimed the recipient's ticket
  - `TICKET_REPLY`: a new reply was added to the recipient's ticket
  - `TICKET_RESOLVED`: the recipient's ticket was resolved
  - `SESSION_UPDATE`: a session request changed state (optional feature)
- `ticketId`: identifier of the related ticket
- `message`: notification text
- `createdAt`: date and time the notification was created
- `read`: whether the recipient has read the notification

### AI usage record

An **AIUsageRecord** is safe audit metadata for one LLM call. It contains no
prompt or response content.

- `usageId`: unique identifier for the record
- `userId`: identifier of the requesting user
- `feature`: one of `ERROR_EXPLAINER`, `FIX_NOTE_DRAFTER`, or `QUEUE_INSIGHTS`
- `inputTokens`, `outputTokens`, `cachedTokens`: token counts reported by the
  LLM provider, or unavailable
- `outcome`: one of `SUCCESS`, `RATE_LIMITED`, `TIMEOUT`, `INVALID_OUTPUT`, or
  `PROVIDER_ERROR`
- `createdAt`: date and time of the call

### User

A **User** represents an account in the application. It is an abstract base
type for students and TAs.

- `userId`: unique identifier for the user
- `name`: user’s name
- `email`: registered email address
- `passwordHash`: password hash
- `registrationDateTime`: date and time the account was created
- `accountType`: one of `STUDENT` or `TA`
- `accountStatus`: one of:
  - `ACTIVE`: the user can sign in
  - `INACTIVE`: the user cannot sign in

New student accounts are active by default. New TA accounts are inactive until
activated by an authorized TA Coordinator. Registration cannot create a
coordinator account or set `isManager` to true.

#### Student

A **Student** is a user who can use student features.

- `studentId`: identifier for the student

#### TA

A **TA** is a user who can use TA features.

- `employeeId`: identifier for the TA in the course or organization
- `isManager`: whether the account is a TA Coordinator that may activate,
  deactivate, or reset other TA accounts

All publicly registered TA accounts have `isManager` set to `false`. The first
TA Coordinator is provisioned through a documented bootstrap procedure.

## AI features and security constraints

| Role | Feature | Input | Output |
| --- | --- | --- | --- |
| Student | Error Explainer | The student's own ticket fields and files | Error explanation, concept, hints, suggested ticket rewrite |
| TA | Fix Note Drafter | One ticket and its thread | Draft fix note for the TA to edit and confirm |
| TA | Queue Insights | Open tickets' titles, languages, concepts, and error summaries | Groups of tickets by concept or misconception |

- AI features are server-mediated through one shared AI gateway and never
  receive passwords, session identifiers, email addresses, or unrelated
  students' records.
- Ticket text, code, files, replies, fix notes, and user prompts are untrusted
  content and may not authorize tool calls or data access.
- The Error Explainer must give hints only and must not return a full solution.
- AI output follows a fixed, validated schema. AI suggestions never change data
  until the authorized user explicitly confirms them.
- The server never fetches a ticket's `repoUrl`; only pasted files are sent to
  the LLM.
- Common secret patterns, such as API keys, are redacted from code before it is
  sent to the LLM.
- The gateway enforces SoC LLM limits with per-user and global rate limits,
  input-size and output-token caps, timeouts, and a non-AI fallback message
  when the LLM is unavailable.
- Prompt-injection tests, cross-student isolation tests, hint-only tests, and
  model-failure fallback tests are required.
- Development runs locally against the Firestore emulator; production runs on
  a separate cloud Firebase project. The two must not share data, credentials,
  or configuration, and developer machines must not hold production
  credentials. Deployment must be performed by team-owned automation.

## Interface design convention

Use the login page's visual theme across the application: a pale blue backdrop,
navy and blue accents, white rounded surfaces, restrained shadows, serif display
headings, clear focus states, and responsive spacing. Keep shared design tokens
and reusable visual classes in a common project CSS file. Reuse interface
elements when their structure and behavior are shared, while giving each page
the layout its function needs. New pages should follow this convention so the
student and TA experiences remain visually consistent.

## Amendments

- 2026-11-07: The human approved planning-document edits for a project-wide visual convention based on the login page, including a common CSS file and reusable interface elements where appropriate. This entry records the approved amendment request and its reason: consistent dashboard styling now and consistent future pages. The substantive convention is added separately after amendment entries are recorded in all affected planning documents.

- 2026-11-08: Updated the product scope from book circulation to event management
  for MP4, including event registrations, attendance, and event notifications.

- 2026-11-08: The team agreed to replace the event-management scope with
  CodeClinic, a programming course help desk, because the MP4 brief requires the
  app to relate to programming or software engineering. Members become Students,
  Librarians become TAs, and manager librarians become TA Coordinators. Events,
  registrations, and bookmarks are replaced by tickets, replies, optional session
  requests, and AI usage records. The product name changes from LibConnect to
  CodeClinic; the repository and organization names are unchanged. The specifications under `workflow/specs/` must be
  amended and reapproved before code changes. The human replied "approved" to
  this amendment on 2026-11-08.

- 2026-11-08: The human directed renaming every remaining LibConnect name to
  CodeClinic: the application directory (`src/codeclinic`), user-visible text,
  the Firestore configuration variables, the session cookie and browser
  storage key names, the package name, and the local emulator project ID
  (`demo-codeclinic`). Only the GitHub organization and repository keep their
  names. The human approved this amendment on 2026-11-08.

- 2026-11-08: The human chose local development (Firestore emulator) and one
  cloud Firebase project for production, instead of separate deployed
  development and production projects. The deployment constraint above was
  updated. The human approved this amendment on 2026-11-08; production is the
  existing `libconnect-mp4` cloud project.
