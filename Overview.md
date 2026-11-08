# LibConnect MP4 Overview

This overview is the product-level scope for the MP4 implementation. Detailed
acceptance scenarios belong in approved specifications under `workflow/specs/`.
Workflows remain in the workflow documents rather than being duplicated here.

## Application context

LibConnect is a web-based library event management platform for publishing
events, managing registrations, and tracking attendance.

The application has two account types: **Members** and **Librarians**. A
librarian may additionally have manager privileges for librarian-account
administration. It will be developed using **React with TypeScript** for the
frontend, **Express.js** for the backend, and **Firestore** for data storage.

The application must include one bounded LLM feature for each account type,
using the required SoC LLM through the server. AI output is advisory and does
not replace server authorization or human approval.

## User stories

### New User

- As a **new user**, I want to register for a member or librarian account so that I can access the features available to that account type.

### Member

#### Browse event catalog

- As a **member**, I want to browse the event catalog so that I can find library events.
- As a **member**, I want to see remaining places for an event so that I know whether I can register.

#### Event registration

- As a **member**, I want to register for an event so that I can secure a place.
- As a **member**, I want to cancel my registration if I cannot attend.
- As a **member**, I want to check in to an event so that my attendance is recorded.
- As a **member**, I want to bookmark an event so that I can find it and register later.

#### Notifications

- As a **member**, I want to receive and view reminders for events I have
  registered for and messages from librarians about those events so that I can
  stay informed before attending.

#### AI assistance

- As a **member**, I want to ask an event assistant about events related to my
  interests so that I can find relevant information more easily.

#### Account management

- As a **member**, I want to update my name, email address, and password so that my account details stay current.

### Librarian

#### Event management

- As a **librarian**, I want to create, view, update, and delete events so that the catalog stays accurate.
- As a **librarian**, I want to set event capacity so that registrations do not exceed available places.
- As a **librarian**, I want to save an event as a draft and publish it later.
- As a **librarian**, I want to add or remove members from an event's registrations.

#### Notifications

- As a **librarian**, I want to send event-related messages to registered
  members so that they know about relevant event details or changes.

#### AI assistance

- As a **librarian**, I want an assistant to summarize event performance using
  registration and attendance metrics.

#### Member account support

- As a **librarian**, I want to view member accounts and update their account status so that I can activate or deactivate accounts when needed.
- As a **librarian**, I want to help a member reset their password so that they can regain access to their account.

### Librarian Manager

A **Librarian Manager** is a librarian with additional account-management permissions.

Manager privilege is server-controlled through `isManager`; it is not a public
registration choice. A master manager account activates newly registered
librarian accounts, which are inactive until activation.

#### Librarian account support

- As a **Librarian Manager**, I want to view librarian accounts and update their account status so that I can activate or deactivate librarian accounts as needed.
- As a **Librarian Manager**, I want to help a librarian reset their password so that they can regain access to their account.

#### Account management

- As a **librarian**, I want to update my name, email address, and password so that my account details stay current.

## Data model

The classes below describe the main data entities. Field types and validation rules should be defined in the implementation or a separate technical specification.

### Event

An **Event** represents a library event, identified by its `eventId`.

- `eventId`: unique identifier for the event
- `name`: name of the event
- `capacity`: maximum number of members who can register
- `datetime`: date and time of the event
- `venue`: location of the event
- `category`: category of event
- `description`: short description of the event
- `code`: code used by registered members to check in at the event
- `isDraft`: whether the event is unpublished and hidden from the member catalog

### Registration

A **Registration** represents a member's signup for an event.

- `registrationId`: unique identifier for the registration
- `eventId`: identifier of the corresponding event
- `memberId`: identifier of the registered member
- `createdDateTime`: date and time the registration was created
- `status`: current status of the registration; one of:
  - `ACTIVE`: the member has registered for the event
  - `CANCELLED`: the member has cancelled their registration
- `attendance`: whether the member checked in; false by default

### Bookmark

A **Bookmark** links a member to an event they want to find again.

- `eventId`: identifier of the event
- `memberId`: identifier of the member who created the bookmark

### Notification

A **Notification** represents an event-related message for a member.

- `notificationId`: unique identifier for the notification
- `recipientUserId`: identifier of the intended recipient
- `notificationType`: category of notification; one of:
  - `EVENT_REMINDER`: a system-generated reminder for an upcoming registered event
  - `LIBRARIAN_MESSAGE`: an event-related message issued by a librarian
- `eventId`: identifier of the related event
- `registrationId`: identifier of the recipient's registration, when the message concerns a specific signup
- `message`: notification text
- `createdAt`: date and time the notification was created
- `read`: whether the recipient has read the notification

### User

A **User** represents an account in the application. It is an abstract base type for members and librarians.

- `userId`: unique identifier for the user
- `name`: user’s name
- `email`: registered email address
- `passwordHash`: password hash
- `registrationDateTime`: date and time the account was created
- `accountType`: one of `MEMBER` or `LIBRARIAN`
- `accountStatus`: one of:
  - `ACTIVE`: the user can sign in
  - `INACTIVE`: the user cannot sign in

New member accounts are active by default. New librarian accounts are inactive
until activated by an authorized master account. Registration cannot create a
manager account or set `isManager` to true.

#### Member

A **Member** is a user who can use member features.

- `memberId`: identifier for the member

#### Librarian

A **Librarian** is a user who can use librarian features.

- `employeeId`: identifier for the librarian in the organization
- `isManager`: whether the account may activate, deactivate, or reset other librarian accounts

All publicly registered librarian accounts have `isManager` set to `false`.
The first manager is provisioned through a documented bootstrap procedure.

## AI security and deployment constraints

- AI features are server-mediated, use allowlisted tools, and never receive
  passwords, session identifiers, or unrelated members’ records.
- Event text, notification text, and user prompts are untrusted content and may
  not authorize tool calls.
- AI state-changing suggestions require explicit approval by the authorized
  user and are recorded in safe audit metadata.
- Rate limits, timeouts, structured output validation, prompt-injection tests,
  cross-member isolation tests, and model-failure fallbacks are required.
- Development and production Firestore projects and credentials must be
  separate. Deployment must be performed by team-owned automation.

## Interface design convention

Use the login page's visual theme across the application: a pale blue backdrop,
navy and blue accents, white rounded surfaces, restrained shadows, serif display
headings, clear focus states, and responsive spacing. Keep shared design tokens
and reusable visual classes in a common project CSS file. Reuse interface
elements when their structure and behavior are shared, while giving each page
the layout its function needs. New pages should follow this convention so the
member and librarian experiences remain visually consistent.

## Amendments

- 2026-11-07: The human approved planning-document edits for a project-wide visual convention based on the login page, including a common CSS file and reusable interface elements where appropriate. This entry records the approved amendment request and its reason: consistent dashboard styling now and consistent future pages. The substantive convention is added separately after amendment entries are recorded in all affected planning documents.

- 2026-11-08: Updated the product scope from book circulation to event management
  for MP4, including event registrations, attendance, and event notifications.
