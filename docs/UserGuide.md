# User Guide

CodeClinic is a help desk for programming courses. Students submit coding
problems as tickets, and TAs claim, answer, and resolve them. AI coaches students
with hints and helps TAs, without doing the work for them.

The current build provides registration, sign-in, account updates, account
support, a notifications inbox, and Student ticket creation. Ticket editing,
viewing, replies, TA workflows, and role-specific AI features are not available
yet; [Planned features](#planned-features) lists them.

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

## Creating a ticket

On the Student dashboard, use **Ask for Help** or select **Create Ticket** in
the header. Enter a title, language, expected behaviour, actual behaviour, and
what you have tried. **Other** is available in the language list; put the
specific language name in the title or another detail. Error output, up to five
concept tags, and source context are optional. For source context, attach up to
three small code files or provide a public GitHub repository URL and relevant
file paths. Choose one source method. The form checks the size and format limits
before sending.

Select **Submit Ticket** to create the ticket. On success, CodeClinic returns
you to the Student dashboard and shows a confirmation. If a check or request
fails, the form stays open with your entries so you can correct them or retry.
Ticket creation does not yet provide ticket details, editing, replies, or TA
responses.

## TA dashboard

The TA dashboard is headed **TA Dashboard**. Its navigation includes **Account**,
**Students**, and **Notifications**. A TA Coordinator also sees **TAs**.

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
| Student | View, edit, and close tickets |
| Student | Reply in a ticket's thread |
| Student | AI Error Explainer: explains an error and gives hints without a full solution |
| Student | Bug FAQ: search anonymised resolved tickets |
| TA | Ticket queue with filters; claim, reply, and resolve with a fix note |
| TA | AI Fix Note Drafter and AI Queue Insights |
| Optional | Live session requests and approvals |

This guide will be updated as each feature is released.
