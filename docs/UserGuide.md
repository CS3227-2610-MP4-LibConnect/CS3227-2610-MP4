# User Guide

CodeClinic is a help desk for programming courses. Students submit coding
problems as tickets, and TAs claim, answer, and resolve them. AI coaches students
with hints and helps TAs, without doing the work for them.

The current build provides registration, sign-in, account updates, account
support, and a notifications inbox. Tickets and role-specific AI features are not available yet;
[Planned features](#planned-features) lists them.

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
out. The navigation also includes **Account** and **Notifications**.

## TA dashboard

The TA dashboard is headed **TA Dashboard**. Its navigation includes **Account**,
**Students**, and **Notifications**. A TA Coordinator also sees **TAs**.

## Ticket queue (TAs)

Select **Queue** in the TA navigation, or **Open the ticket queue** on the TA
dashboard. The **Ticket queue** page lists tickets oldest first. Use the
**Status** filter (default **Active (open and claimed)**; also **Open**,
**Claimed**, **Resolved**, **Closed**), the **Language** filter, and the
**Concept** box (an exact concept tag, such as `recursion`). A ticket that is
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

Tickets are created by students, which is not available yet, so the queue is
empty until that feature is released.

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

## Planned features

These CodeClinic features are planned and **not available in the current build**:

| Role | Planned feature |
| --- | --- |
| Student | Create, edit, close, and view tickets with code files and error output |
| Student | Reply in a ticket's thread |
| Student | AI Error Explainer: explains an error and gives hints without a full solution |
| Student | Bug FAQ: search anonymised resolved tickets |
| TA | AI Fix Note Drafter and AI Queue Insights |
| Optional | Live session requests and approvals |

This guide will be updated as each feature is released.
