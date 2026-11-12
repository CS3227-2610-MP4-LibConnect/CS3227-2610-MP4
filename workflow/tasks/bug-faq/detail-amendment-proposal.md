# Bug FAQ detail-view amendment proposal

Proposed: 2026-11-12, after the human approved v0.2 and clarified the FAQ detail content.
State: approved to proceed with drafting v0.3. The human instructed "continue execution" on 2026-11-12 after clarifying message names may remain visible. This does not approve the resulting v0.3 specification, checklist, handoff, batch plan, or implementation dispatch.

## Requested behavior

Search remains limited to tickets whose stored status is exactly `RESOLVED`. Dashboard search cards show title and concept tags. Opening a result shows the title, tags, the TA's fix note, and the ticket conversation. Every conversation entry uses the server-derived speaker label **Student** or **TA** in place of the person's name. The FAQ does not use the owner-only ticket detail route or expose ticket/owner/reply IDs, account names, author IDs, code/file attachments, repository references, or other private ticket fields.

Speaker-label replacement does not remove names, identifiers, or private material typed inside a title, tag, fix note, or message body. The human explicitly confirmed that names written in messages may remain visible. User-authored content renders as written; only the displayed speaker names become **Student** and **TA**. Describe the view as limited and label-masked, not fully anonymous. Automatic redaction of message content is outside this amendment.

## Proposed artifact and test changes after approval

1. Draft `workflow/specs/bug-faq.md` v0.3 with a dated amendment: replace the title/tag-only **detail** limit with a two-level contract (title/tag search cards; title/tags/fix note/conversation on open). Keep exact `RESOLVED` filtering and Student-only access. Specify a read-only FAQ detail API using an opaque result reference, server-side status recheck, server-derived speaker roles, bounded reply pagination, no-store responses, and safe invalid/expired-reference errors. No raw ticket ID or author/account record may enter the FAQ response. Specify no links or actions to owner-only detail, posting, or ticket modification.
2. Revise `Overview.md`, `workflow/PLAN.md`, and the Bug FAQ note in `workflow/specs/ta-ticket-queue.md` to describe the detail view and label masking, while preserving dated amendment history. The TA resolution state machine and full owner/TA ticket route remain unchanged.
3. Draft `workflow/tasks/bug-faq/tasks.md` and `handoff.md` v0.3. T01 adds a store read for resolved-only FAQ detail and bounded replies; T02 adds protected detail API, opaque-reference validation, server-side speaker labels, and projection tests; T03 adds an accessible open/back detail view with fix note, conversation, continuation, and UI tests; T04 adds privacy and multi-owner integration checks, guide updates, and the 320 CSS-pixel human visual check. Revise the proposed batch plan to v0.3 while retaining T01–T02 then T03–T04.
4. After fresh v0.3 specification, checklist, and handoff approvals, revise the three preimplementation test suites and coverage report. Their earlier v0.1 `CLOSED` expectations are stale and they do not test the new detail view. Preserve prior run logs as historical evidence.

## Risks and gates

The detail view discloses user-authored fix notes and messages across Students. Names inside message text may remain visible by explicit human direction; labels alone cannot ensure anonymity, and content may include code or other identifying details. Every FAQ read must enforce an active Student session and exact stored `RESOLVED` status before returning the limited projection. The requested display is read-only and does not change ticket ownership or status transitions.

Under `workflow/agents/orchestrator.toml`, this requirement change needs approval of this proposal before editing the approved v0.2 specification, followed by fresh specification, checklist, handoff, batch-plan, and implementation-dispatch approvals. Live Firestore index deployment, commit, push, and merge remain separate decisions.
