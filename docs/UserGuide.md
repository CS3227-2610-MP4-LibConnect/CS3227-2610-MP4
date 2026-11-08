# User Guide

CodeClinic is a help desk for programming courses. Students submit coding
problems as tickets, and TAs claim, answer, and resolve them. AI coaches students
with hints and helps TAs, without doing the work for them.

> **Release status (8 Nov 2026).** The team is moving the app from its earlier
> library scope to CodeClinic. The current build still shows the earlier
> **LibConnect** name, the **Member** and **Librarian** account types, and a
> Book catalog. This guide describes the current build exactly as it behaves.
> [Planned features](#planned-features) lists what is not available yet. In this
> guide, **Member** corresponds to a future Student and **Librarian** to a
> future TA.

## Accessing the app

- **Deployed app:** not yet available. The production URL will be added here
  once deployment is set up.
- **Local copy:** follow
  [Running the development server](DeveloperGuide.md#running-the-development-server)
  in the Developer Guide, then open `http://localhost:3001/`.

Use only made-up test details. Do not enter a real password you use elsewhere.

## Creating an account

1. On the sign-in page, select **Register**.
2. Under **Register as**, choose **Member** or **Librarian**.
3. Enter your **Name**, **Email address**, **Password**, and **Confirm password**.
   A Librarian also enters an **Employee ID**.
4. Select **Create account**.

Rules:

- Every field is required. The email must look like `name@example.com`.
- The password must be at least 8 characters, and both password fields must
  match.
- Each email address can register only one account.

After a successful registration, the page confirms it and returns to sign-in
after five seconds. Select **Go to login now** to return immediately.

- A **Member** account can sign in straight away.
- A **Librarian** account starts inactive. A manager librarian must activate it
  before you can sign in. Account activation is not available in the app yet.

## Signing in and out

1. On the sign-in page, enter your email address and password.
2. Under **Sign in as**, choose the account type you registered with.
3. Select **Sign in**.

If any detail is wrong, including the account type, the page shows **Unable to
sign in with those details.** It does not say which detail was wrong. After too
many failed attempts, wait before trying again.

After you sign in, the app opens your dashboard. To sign out, select **Log out**.
You are also signed out after 30 minutes without activity, or eight hours after
signing in.

## Member dashboard: Book catalog

The Member dashboard lists the Book catalog. Each card shows a book's title,
author, and a shortened synopsis.

- **Search:** type text and select **Search** to find books whose title or author
  contains it. Letter case does not matter.
- **Advanced search:** open it to search by title, author, publisher, category,
  ISBN, synopsis, and a publication year range from 1450 to 2100. Every field you
  fill in must match.
- **Clear search:** clears every search field and shows the whole catalog again.
- **Load more books:** shows the next page of results.
- Select **LibConnect** at the top left to return to the unfiltered dashboard.

The Book catalog belongs to the earlier library scope. It will be replaced by
the Bug FAQ.

## Librarian dashboard

The Librarian dashboard is a landing page. It has no other features yet.

## Planned features

These CodeClinic features are planned and **not available in the current build**:

| Role | Planned feature |
| --- | --- |
| Student | Create, edit, close, and view tickets with code files and error output |
| Student | Reply in a ticket's thread |
| Student | AI Error Explainer: explains an error and gives hints without a full solution |
| Student | Bug FAQ: search anonymised resolved tickets |
| TA | Ticket queue with filters; claim, reply, and resolve with a fix note |
| TA | AI Fix Note Drafter and AI Queue Insights |
| TA | Activate, deactivate, and reset student accounts |
| TA Coordinator | Activate, deactivate, and reset TA accounts |
| Everyone | Notifications inbox and account details updates |
| Optional | Live session requests and approvals |

This guide will be updated as each feature is released.
