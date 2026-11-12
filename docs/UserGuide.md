# User Guide

CodeClinic is a help desk for programming courses. Students submit coding
problems as tickets, and TAs claim, answer, and resolve them. Optional AI help
offers Students hints and ticket-wording suggestions and assists TAs; its
suggestions do not act on tickets by themselves.

The current build provides registration, sign-in, account updates, account
support, a notifications inbox, Student ticket creation and activity, the full
My Tickets list, the resolved-ticket Bug FAQ, Student ticket help chat, TA
ticket workflows, and TA AI features. Ticket editing is not available yet;
[Planned features](#planned-features) lists it.

## Accessing the app

- **Deployed app:** not yet available. The production URL will be added here
  once deployment is set up.
- **Local copy:** follow
  [Running the development server](DeveloperGuide.md#running-the-development-server)
  in the Developer Guide, then open `http://localhost:3001/`.

Use only made-up test details. Do not enter a real password you use elsewhere.

## Creating an account

1. On the sign-in page, select **Register**.
2. Under **Register as**, choose **Student** or **TA**.
3. Enter your **Name**, **Email address**, **Password**, and **Confirm password**.
   A TA also enters an **Employee ID**.
4. Select **Create account**.

Rules:

- Every field is required. The email must look like `name@example.com`.
- The password must be at least 8 characters, and both password fields must
  match.
- Each email address can register only one account.

After a successful registration, the page confirms it and returns to sign-in
after five seconds. Select **Go to login now** to return immediately.

- A **Student** account can sign in straight away.
- A **TA** account starts inactive. A TA Coordinator must activate it before you
  can sign in. Coordinators use the **TAs** page to activate TA accounts.

## Signing in and out

1. On the sign-in page, enter your email address and password.
2. Under **Sign in as**, choose the account type you registered with.
3. Select **Sign in**.

If any detail is wrong, including the account type, the page shows **Unable to
sign in with those details.** It does not say which detail was wrong. After too
many failed attempts, wait before trying again.

After you sign in, the app opens your dashboard: `/student/dashboard` for a
Student and `/ta/dashboard` for a TA. If you open the other role's dashboard,
the page shows **Access denied** with a link to your own dashboard. To sign out,
select **Log out**. You are also signed out after 30 minutes without activity,
or eight hours after signing in.

## Student dashboard

The Student dashboard is a landing page headed **Student Dashboard**. It shows
**Welcome back** followed by your registered name. Select **CodeClinic** at the
top left to return to the dashboard, or **Log out** at the top right to sign
out. The navigation includes **Create Ticket**, **My Tickets** immediately to
its right, **Account**, and **Notifications**.

The **Active tickets** section shows up to five of your most recently updated
open or claimed tickets. Select a ticket card to see its details and
conversation. A loading message appears while tickets are fetched; if there
are none, the section says so. If loading fails, use **Retry**. Select **View
all tickets** or **My Tickets** in the header to open your protected ticket
list.

## My Tickets

My Tickets opens at `/student/tickets` with **Open** selected and shows your
`OPEN` and `CLAIMED` tickets. Select **Closed** to see both `CLOSED` and
`RESOLVED` tickets, or select **Open** to return. Each card uses the dashboard
layout: title, language and readable status (**Open**, **Claimed**, **Closed**,
or **Resolved**), then concept tags or **No concept tags**. Closed-view cards
are slightly greyed out. Select a card to open its details.

The page loads 20 tickets at a time. Select **Load more** to continue through
the selected view. If there are no tickets in that view, the page says so. If
a request fails, use **Retry**; tickets already loaded remain visible when
loading a later page fails.

## Creating a ticket

On the Student dashboard, use **Ask for Help** or select **Create Ticket** in
the header. Enter a title, language, expected behaviour, actual behaviour, and
what you have tried. **Other** is available in the language list; put the
specific language name in the title or another detail. Error output, up to five
concept tags, and source context are optional. For source context, attach up to
three local UTF-8 text code files (up to 24 KiB each) or provide a public
GitHub repository URL and relevant file paths. The form lists selected file
names and sizes and lets you remove a file. Choose one source method. The form
checks the file count, size, filename, text encoding, and request-size limits
before sending; a rejected selection leaves previously accepted files in the
form.

Select **Submit Ticket** to create the ticket. On success, CodeClinic returns
you to the Student dashboard and shows a confirmation. If a check or request
fails, the form stays open with your entries so you can correct them or retry.

### Ticket help bot

On **Create Ticket** (`/student/tickets/new`), select **Open Ticket help bot**
at the lower right. The side popup starts with **What help do you need?** Ask
about the programming problem or ask it to improve ticket
wording, even while the draft is incomplete. It can offer hints, explain a
concept, ask for more context, or suggest clearer text for specific fields.
Suggestions appear in the conversation only: the bot never fills the form or
submits a ticket. The current draft, including attached source content, is
sent with each question, so review it before selecting **Send**. Chat and ticket
submission wait until selected files finish reading.

On a ticket you own (`/student/tickets/:ticketId`), the same button appears
after the ticket loads. This chat uses that ticket and its relevant replies to
offer hints; it does not rewrite the ticket or post a reply. The bot is not
available on the dashboard, ticket list, or TA pages.

The popup shows bot messages on the left and yours on the right. Type in the
**Your question** field and select **Send**. **Clear chat** removes the local conversation;
the close button or Escape hides the popup, and reopening it keeps the
conversation while you stay on that page. Refreshing, navigating away, or
signing out clears it. Only the most recent four exchanges are sent with a new
question. A failed request keeps your question for another try and does not
change the ticket or its draft. If the bot is busy, unavailable, or cannot
prepare a safe reply, wait and retry or continue without it.

The bot cannot guarantee a correct or complete answer. Do not enter passwords,
API keys, tokens, or other secrets in the chat or ticket draft; automatic
redaction can miss them. Review any wording suggestion yourself before typing
it into the ticket.

## Viewing, replying to, and closing a ticket

On a ticket detail page, review its status, language, tags, description, source
context, and timestamps. The conversation shows each reply's author, role, and
date and time. Select **Load more replies** to continue through a long thread.
If a block fails, your loaded replies remain on screen and **Retry** requests
that block again. Replies are available while the ticket is open or claimed;
enter plain text and select **Send reply**. A failed reply remains in the form
for another attempt. You can select **Close Ticket** to close an open or
claimed ticket without a resolution. The page confirms a close only after the
server accepts it. Closed or resolved tickets cannot receive replies; a closed
ticket's close control is disabled.

## TA dashboard

The TA dashboard is headed **TA Dashboard**. Its navigation includes **Account**,
**Students**, and **Notifications**. A TA Coordinator also sees **TAs**.

## Ticket queue (TAs)

Select **Queue** in the TA navigation, or **Open the ticket queue** on the TA
dashboard. The **Ticket queue** page lists tickets oldest first. Use the
**Status** filter (default **Active (open and claimed)**; also **Open**,
**Claimed**, **Resolved**, **Closed**), the **Language** filter, and the
**Concept tag** box (an exact concept tag, such as `recursion`). A ticket that is
claimed shows **Claimed by you** or **Claimed**. Select **Load more** to see the
next 20 tickets, or **Retry** if the list fails to load.

Select a ticket to open it. The page shows the student's name, the code,
error output, and what the student tried, followed by the **Replies** thread.

- **Claim** an open ticket to take it. Only one TA can claim a ticket, and only
  that TA can **Unclaim** it.
- Type a message in **Reply** and select **Send reply**. Any TA can reply while
  the ticket is open or claimed (up to 4000 characters).
- To finish, the TA who claimed the ticket writes a **Fix note** (up to 2000
  characters), selects **Resolve…**, then **Confirm resolve**. A resolved ticket
  accepts no more replies, and the note cannot be changed.

If another action changed the ticket first, you see "This ticket changed. The
latest version is shown." Review it and try again. The student is notified when
you claim, reply to, or resolve their ticket.

Student-created tickets appear in the queue after they are submitted.

### AI help for TAs

Two optional AI features help TAs. AI output is advisory: it is a suggestion
labelled **AI suggestion**, it is shown as plain text, and it never changes a
ticket, sends a message, or resolves anything by itself. Check it before you use
it.

**Draft with AI (ticket page).** If you have claimed a ticket, the **Fix note**
area has a **Draft with AI** button. It fills the Fix note with a suggested
note and shows "AI draft. Review and edit before resolving." Edit it as needed.
It never submits: the ticket is resolved only when you select **Resolve…** and
**Confirm resolve**. If the Fix note already has text, you are asked before it
is replaced. Only the TA who claimed the ticket sees the button.

**Queue insights (queue page).** The **Queue insights** panel groups active
tickets by shared concept or likely misconception, with a one-line summary of
what to re-teach and links to the tickets. Select **Generate insights** to run
it; it is never generated automatically. It covers the oldest 60 active tickets
("Based on the oldest 60 active tickets" is shown when there are more). A result
can be reused for 5 minutes by any TA if the queue has not changed, and is then
marked "Cached result".

If an AI feature fails, the rest of CodeClinic still works. The messages mean:

- "AI help is unavailable right now. You can still write the note yourself." or
  "Queue insights are unavailable right now.": the AI service is off or not
  reachable. Write the note yourself or try later.
- "AI limit reached. Please try again in a minute.": you or the system used up
  the AI request limit. Wait and retry.
- "This ticket is too long for an AI draft." or "The queue is too large to
  summarise.": the content is too long for the AI. Write the note yourself.
- "The AI reply could not be used. Please try again or write the note yourself."
  (fix note draft) or "The AI reply could not be used. Please try again."
  (queue insights): the AI answered in an unusable form. Try again.

Do not paste passwords, API keys, tokens, or other personal data into tickets
or replies. Ticket text may be sent to the AI service, and automatic removal of
secrets can miss some.

## Updating your account

Select **Account** in the dashboard navigation. Under **Profile**, update your
name or email and select **Save profile**. Changing your email requires your
current password. An email already used by another account is rejected.

Under **Password**, enter your current and new passwords, then select **Change
password**. New passwords need at least 8 characters. A successful password
change signs out your other sessions and keeps the current session.

## Supporting accounts

TAs and Coordinators select **Students** to list student accounts. Coordinators
can also select **TAs** to support other TA accounts. Use **Load more** for
additional accounts. Coordinators cannot support their own account through this page.

- **Activate** enables sign-in. **Deactivate** asks for confirmation and signs
  the account out of all sessions.
- **Reset password** asks for confirmation, signs out the target account, and
  displays one temporary password. Select **Copy password**, share it with the
  owner outside CodeClinic, and select **Hide password** when finished. The app
  does not store or display that plain-text password again.
- After signing in with a temporary password, the owner must complete **Change
  your password** before accessing other features.

The first Coordinator is provisioned by a human administrator using the
[bootstrap procedure](DeveloperGuide.md#first-ta-coordinator), outside the web app.

## Notifications

Select **Notifications** (the bell) in the navigation. Its badge shows up to 99
unread items. The inbox shows each message as plain text with its type and
relative time. Select **Mark as read** for an item or **Mark all as read** to
clear the unread items. Failed actions offer **Retry**.

The inbox infrastructure is ready. Ticket features will create notifications
and supply related-ticket links when those features are integrated; they are
not part of the current shared-work build.

## Bug FAQ

Below **Ask for Help** on the Student dashboard, **Bug FAQ** searches resolved
tickets shared across the platform. Choose **Title** or **Tags**, enter a term,
and select **Search**. Each result card shows only the ticket title and concept
tags; select the card to read the fix note and continue through the conversation.
Conversation speakers are labelled **Student** or **TA**; names typed in message
bodies remain part of the text. The FAQ is read-only and does not expose ticket
owner actions. Use **Search more** to scan another result batch and **Load more
replies** to continue a long conversation. Empty searches, loading, and request
failures are shown in the section, with Retry where available.

The FAQ includes tickets whose current status is **Resolved**. Open, claimed,
and closed tickets are not searchable. Search results contain no owner identity
or ticket ID.

## Planned features

These CodeClinic features are planned and **not available in the current build**:

| Role | Planned feature |
| --- | --- |
| Student | Edit a ticket after creation |
| Optional | Live session requests and approvals |

This guide will be updated as each feature is released.
