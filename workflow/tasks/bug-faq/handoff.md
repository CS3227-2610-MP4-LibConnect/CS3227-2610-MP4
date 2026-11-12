# Analyst handoff: bug-faq

Handoff version: 0.4 approved (2026-11-12)
Task ID: `bug-faq`
Specification: `workflow/specs/bug-faq.md` v0.4 approved (2026-11-12)
Checklist: `workflow/tasks/bug-faq/tasks.md` v0.4 approved
Approval state: the human approved specification, checklist, and handoff v0.4 on 2026-11-12. the human approved the batch plan and Batch 1 dispatch on 2026-11-12; the v0.3 manifest is obsolete for implementation.

## Scope, dependencies, and allowed files after later gates

Build a read-only Bug FAQ on `/student/dashboard`, below Ask for Help. Search only stored `RESOLVED` tickets from any Student, with Title or Tags selection. Search cards show only title and tags. Opening a card shows title, tags, fix note, and the conversation, paginated and read-only. Speakers are labelled Student or TA using server-derived roles; names typed in message text may remain visible. Every externally returned FAQ reference and continuation cursor is an authenticated-encryption token derived from the current trusted session `idHash`, Student-bound and purpose-bound. Tokens cannot be reused from another session, including the same Student, and expire at logout/session rotation. Student-closed `CLOSED` tickets are excluded. Preserve the owner-only detail route, My Tickets, TA resolution, and the ticket state machine.

Dependencies: approved `student-tickets` data model, `ta-ticket-queue` status contract, and `student-ticket-activity` dashboard. Implement T01–T04 in order. After fresh v0.4 checklist and handoff approvals, the orchestrator proposes batches of at most two consecutive items and asks for separate approval. T01–T02, then T03–T04, are draft groupings only.

After batch approval, scoped changes may touch `src/codeclinic/server/tickets/` store, route, validation, and cursor modules; `src/codeclinic/firestore.indexes.json`; `src/codeclinic/src/StudentDashboard.tsx` and relevant dashboard styles or a scoped FAQ component; related tests under `src/codeclinic/test/`; `docs/UserGuide.md`, `docs/DeveloperGuide.md`; task reports under `workflow/tasks/bug-faq/`; and factual logs under `logs/tasks/bug-faq/`. Any additional source file needs an approved scope amendment. Do not change dependencies, lockfiles, CI/deployment config, Firestore rules, account/session policy, ticket state transitions, or unrelated data models. Preserve the human's pre-existing uncommitted `StudentDashboard.tsx` change.

## Trust, authorization, and data handling

The server-validated cookie session and freshly loaded active Student account establish identity and role for every FAQ request. Stored Firestore status establishes eligibility. Never use client-supplied status, role, owner, ticket ID, or cursor for authorization. Search must constrain and verify `RESOLVED`; detail must recheck the stored status on every read. Encrypt FAQ references and search/reply cursors with AES-256-GCM keys derived via HKDF-SHA-256 from the current trusted `auth.idHash`; use a fresh nonce and bind the Student ID, token purpose, and relevant query/reference as authenticated associated data. No token mapping or configured secret is permitted by this scope. Reject tokens from other sessions (including the same Student), after logout/session rotation, or with altered bindings. Bound search and reply pages, and ensure replies belong to the referenced ticket. Return exact projections only. Do not return raw ticket/reply IDs, owner/account IDs, author names or IDs as metadata, code/files, error output, repository references, raw documents, or owner-only routes/actions. Derive each speaker label from trusted author identity. Render user-authored fields literally; names typed inside messages are allowed to remain visible. Use synthetic content and do not log search terms, ticket content, session material, credentials, or private data.

## Verification and known risks

Follow the v0.3 specification's store, API/security, UI, integration, and accessibility matrix after it is approved. Cover all statuses, multiple owners, sparse/dense matches, >100 resolved records, cursor/page boundaries, invalid and cross-search/detail refs, reply membership/pagination, denials, no-store responses, storage failures, stale UI requests, literal rendering, and dashboard regressions. Run focused tests, relevant full tests, and production build; preserve full logs and report every failure. Verify index config against exact query shape. Emulator checks cannot prove production index deployment; this handoff authorizes no live Firestore access or deployment.

Titles, tags, fix notes, and message text may contain identifying or sensitive content; names typed in messages may remain visible by explicit human direction. The FAQ projection does not guarantee anonymity. Sparse matches may need repeated Search more actions. Human visual check required at `/student/dashboard`, 320 CSS pixels: Title/Tags searches, open/back, search/reply continuation, keyboard focus, readability, and horizontal overflow. Record observations and relevant screenshot if requested; do not mark passed before human evidence.

## Sources, skills, tools, and approvals

Sources: human requests and clarifications; `Overview.md`; `workflow/PLAN.md`; `workflow/README.md`; `workflow/specs/bug-faq.md` v0.4 draft; related approved ticket and TA queue specs; existing dashboard, ticket router/store/validation/index files and relevant tests. Discovery details: `logs/tasks/bug-faq/analyst-2026-11-12.md`, `orchestrator-2026-11-12.md`, and `implementation-T01-2026-11-12.md`.

Selected planning skills: `openspec-explore` and `openspec-propose`, adapted through repository `workflow/specs/`. Firebase Firestore skill consulted for index planning without external access. The implementer must perform `openspec-apply-change` preflight using the same adapter after batch approval; `seedu-git-standard` applies only if a commit is separately approved. No live database or browser image was used for planning.

Before implementation, read approved spec, checklist, handoff, and batch assignment from disk and verify exact versions and human approvals. Keep implementer and reviewer separate. A passing test or agent response cannot advance an approval gate.

## Amendment history

- 2026-11-12: Revised v0.2 search-only behavior to include read-only detail with fix note and paginated conversation. Speaker labels are server-derived Student/TA; names typed inside message text may remain visible. v0.3 artifacts were approved by the human on 2026-11-12.
- 2026-11-12: Drafted v0.4 after the human approved the session-bound reference amendment proposal. The human subsequently approved all v0.4 artifacts and Batch 1 dispatch on 2026-11-12.
