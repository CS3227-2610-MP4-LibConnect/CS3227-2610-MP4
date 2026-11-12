# Batch 6 commit proposal

Status: the human approved both messages and commits in conversation on 2026-11-12. Merge, push, and deployment require separate decisions.

## Commit 1 — production code and tests

```text
Student: Add code file picker to Create Ticket

The Create Ticket form asks students to paste filenames and file contents.
This makes attaching local code awkward and obscures file size limits.

Let students select up to three UTF-8 text files, show their names and
sizes, and remove them before submission. Reject invalid or oversized
files before reading, and block ticket and chat sends during reads.

Keep the existing JSON files contract and server validation. Cover
selection, rejection, removal, source conflicts, and pending reads.
```

Files: `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `TicketCreatePage.css`, `StudentHelpChat.tsx`, `src/codeclinic/test/StudentTickets.test.tsx`, and `StudentTicketHelpChat.test.tsx`.

## Commit 2 — documentation and task evidence

```text
docs: Document student ticket file attachments

The guides describe pasting file contents into Create Ticket. Update
them for local file selection and explain the unchanged size and API
limits.

Record the approved specification, implementation checks, human browser
report, independent review, and completed task checklist for Batch 6.
```

Files: `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `workflow/specs/student-tickets.md`, and Batch 6 files under `workflow/tasks/student-tickets/` and `logs/tasks/student-tickets/`. The source/test files listed for Commit 1 are excluded from Commit 2.
