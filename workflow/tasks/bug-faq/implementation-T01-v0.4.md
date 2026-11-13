# Bug FAQ Batch 1 implementation report — T01 (v0.4)

Status: **Complete; ready for independent review**

Specification: `workflow/specs/bug-faq.md` v0.4 approved. Checklist and handoff: v0.4 approved. Assignment: Batch 1, T01 followed by T02; validated manifest: `workflow/tasks/bug-faq/assignment-batch-1.json`. The earlier `implementation-T01.md` is historical v0.3 blocker evidence and remains unchanged.

## Implemented

- Added a stateless token codec using HKDF-SHA-256 over the trusted session `idHash`, AES-256-GCM, a fresh 12-byte nonce, a 16-byte authentication tag, and associated data binding the token to its purpose, Student ID, and canonical search/detail binding.
- Added bounded FAQ search and detail store methods. Search constrains stored status to `RESOLVED`, orders by `createdAt DESC` and document ID `ASC`, scans at most 100 tickets, returns at most 20 safe title/tag projections, and encrypts the last-examined continuation boundary and each FAQ reference.
- Detail decrypts session-bound references and reply cursors before ticket reads, rechecks stored `RESOLVED`, returns a constrained internal ticket/reply projection, orders replies by `createdAt ASC` and stored `replyId ASC`, limits reply reads to 51 for a maximum 50 returned replies plus one lookahead, and excludes malformed or foreign-ticket replies.
- Added the composite `tickets` index `{ status ASC, createdAt DESC, __name__ ASC }` and updated the existing index test to keep the Bug FAQ index separate from TA queue index classification while asserting the exact FAQ query/index shape.

## Acceptance status

- Stored `RESOLVED` constraint, stable order, 100-document scan bound, 20-result cap, title/tag substring matching, safe projection, and encrypted query-bound continuation: **Met**.
- Encrypted FAQ references bound to current session and Student, with no raw ticket ID in the token: **Met**.
- Detail status recheck, exact internal field selection, 50-reply output cap with bounded lookahead, reply membership validation, and ticket-bound pagination: **Met**.
- Malformed summary/detail/reply documents are skipped or rejected safely: **Met** for tested malformed fields and foreign reply membership.
- Composite index config matches the query shape: **Met in source configuration**; live deployment and database index readiness were not checked or authorized.

## Checks

Exact commands and outcomes are in `logs/tasks/bug-faq/implementation-T01-v0.4-2026-11-12.md`. The final focused token, store, and index test run passed: **3 suites, 42 tests**. T01 was complete before T02 began.

## Limitations and risks

- Index availability in a deployed Firestore project remains unverified; no live Firestore access or deployment was performed.
- Store behavior was verified with synthetic Firestore query doubles, not an emulator or production database.
- Cross-owner title, tag, fix-note, and message content can contain identifying text, as documented in the approved specification.
- Protected HTTP routes and end-to-end API behavior are covered by T02; see its separate v0.4 implementation report and log.
