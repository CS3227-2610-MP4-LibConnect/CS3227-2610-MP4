# Implementation checklist: student-tickets

Version: 0.4 (2026-11-12 file-picker amendment; human-approved in conversation)
Task ID: `student-tickets`
Specification: `workflow/specs/student-tickets.md` v0.5, human-approved 2026-11-12
Approval state: T01–T07 are complete after independent review. The human separately approved specification v0.5, checklist v0.4, handoff v0.4, batch plan v0.3, and Batch 6 dispatch on 2026-11-12. Commit and merge remain separate decisions.

This checklist covers ticket creation only. The human approved the shared-contract reconciliation proposal v0.3 and specification v0.3. Checkboxes are updated by the orchestrator only after independent review. Original task wording from approved v0.1 is retained below; additional v0.2 criteria follow each affected item.

- [x] **T01 — Ticket create API and persistence.** Add the bounded `POST /api/tickets` request contract, session-backed active Student authorization, CSRF check, allowlisted fields, server-chosen ID, `OPEN` state, server timestamps, and safe `201`/error responses. Store optional files or repository references without fetching a URL. Test visitor and TA denial, forged fields, malformed and oversized bodies, storage failure, and no persisted Notification. (Spec R4; scenarios 4, 6–8, 11–12.)

  v0.2 addition: Use exact request names `files` and `repoFilePaths`; validate the seven fixed language choices, 0–5 normalized concept tags, and revised title/detail/repository limits. Store the complete C1 document at `tickets/{ticketId}` with Firestore `Timestamp`s and specified null/empty initial values. Verify the endpoint has no access to later state transitions or replies. (Spec v0.3 R4; scenarios 14–15.)

- [x] **T02 — Protected create route and form.** Add `/student/tickets/new` to the existing frontend and server deep-link routing. Use server session validation before rendering the form, with sign-in redirect and TA denial. Build the labeled form for required and optional fields, bounded client validation, accessible errors and pending state, safe plain-text treatment, and failure preservation. Test direct entry and refresh, validation, duplicate submit, failures, and keyboard and 320-pixel layout. Depends on T01's approved request contract. (Spec R2–R3, R6; scenarios 3–5, 9, 11, 13.)

  v0.2 addition: Use only the seven fixed language choices with no manual value, show the `Other` explanation below the selector, apply five-tag normalization and the revised length limits, and submit `files`/`repoFilePaths`. (Spec v0.3 R3–R4; scenarios 14–15.)

- [x] **T03 — Entry points and success feedback.** Add the `Ask for Help` dashboard section and Student-only header `Create Ticket` action. After a verified `201`, navigate to the Student dashboard and show transient success feedback; keep failures on the form. Test both links, TA absence, success and malformed responses, and no premature success. Depends on T02. (Spec R1, R5; scenarios 1–2, 9–10.)

- [x] **T04 — Integration verification and guides.** Run focused tests, full project tests, build, and emulator-backed storage integration with synthetic data. Inspect keyboard and 320-pixel behavior. Update User Guide and Developer Guide for the shipped create flow, and record implementation and security evidence. Depends on T01–T03. (Spec verification matrix.)

  v0.2 addition: Verify C1 shape, Firestore `Timestamp` fields, null/empty initial values, no browser collection access, the fixed language selector, tag normalization, and the revised limits in both UI and API evidence.

- [x] **T05 — Member header and language placeholder follow-up.** Show the shared authenticated header on the verified Student create-ticket page without changing header action order. Keep authenticated navigation hidden during session checking and denial. Start the language selector on a disabled empty placeholder, then prevent reselecting it. Add focused route/form tests, run focused tests and build, and obtain independent review. (Spec v0.4 R3, R6.)

- [x] **T06 — Select local code files on Create Ticket.** Replace manual filename/content fields with an accessible file picker, accepted-file list and removal controls. Read only valid UTF-8 text after checking filename, 24 KiB bytes, and three-file cap; preserve existing files on rejected selection. Block ticket and create-page help-chat submission while a read is pending. Keep the current JSON `files` shape, 128 KiB serialized-body check, repository-source exclusivity, page-only state, and independent server validation unchanged. Add focused UI tests for valid selection, removal, rejected files, pending reads, source conflict, and request payloads. (Spec v0.5 R3–R4; scenarios 16–19.) Depends on T02 and the reviewed Student help-chat integration.

- [x] **T07 — Verify attachment flow and update guides.** Run focused Create Ticket, help-chat, and ticket API tests plus the production build. Independently review the T06 change and verify that direct API calls still enforce the old limits and authorization contract. Update the User Guide and Developer Guide for the file picker; record spec version, changed files, commands, results, and unresolved risks. Request the human's browser check at `/student/tickets/new` at 320 × 640 CSS pixels for file selection/removal, accessible errors/focus, no horizontal overflow, and unchanged ticket/help-chat behavior. (Spec v0.5 verification matrix and scenarios 16–19.) Depends on T06.

## Approval boundaries

Specification v0.3, this checklist v0.2, and `handoff.md` v0.2 are human-approved in separate conversation turns. Obtain approval of a revised batch plan and implementation dispatch before production changes. Each batch receives independent review before the next starts. Commit and merge decisions remain human gates.

For v0.5, the human separately approved the specification and this checklist on 2026-11-12. Handoff v0.4 requires its own approval before a new batch plan or dispatch. The checked T01–T05 evidence remains historical and is not reopened.

## Amendments

- 2026-11-12: T06–T07 completed in approved Batch 6. The human reported the 320 × 640 browser check passed. Focused integration tests passed (4 suites, 96 tests), the production build passed, and independent review passed after a source-error focus correction. The Batch 6 completion manifest validated before these items were checked. Commit and merge remain separate human decisions.

- 2026-11-12: The human approved v0.4 against the separately approved file-picker specification v0.5. Added T06–T07 without changing completed T01–T05 or the server ticket contract. This approval does not approve the handoff or dispatch.

- 2026-11-09: T05 focused suite passed 14/14 tests, production build passed,
  and independent review passed with a shared-workspace provenance limitation.
  Batch 5 completion manifest validated before T05 was checked. Commit and
  merge remain separate human decisions.

- 2026-11-09: Added T05 for the human-directed member navigation and language
  selector follow-up. Prior T01–T04 completion and evidence remain unchanged.

- 2026-11-09: v0.1 drafted and human-approved against specification v0.2.
- 2026-11-09: Proposed v0.2 after approval of shared-contract reconciliation v0.3. Preserved T01–T04 wording and order; added the new data-contract criteria without checking any item. Awaiting separate human approval after specification v0.3.
- 2026-11-09: The human approved checklist v0.2 and handoff v0.2 in the conversation after separately approving specification v0.3.
- 2026-11-09: Reopened T01 after full-suite verification exposed a registration regression in the ticket server wiring. The human approved a scoped server-wiring correction and independent review; T01 remains open until that review passes. Batch 3 remains on hold. The approved T01 wording and version are unchanged.
- 2026-11-09: Corrective assignment Batch 4 passed independent re-review after finding T01-W1 was fixed. Registration, ticket, and guard focused checks passed (6 suites, 126 tests); the first independent review's full suite passed (41 suites, 3 skipped; 737 tests passed, 3 skipped). The completion manifest passed validation, and T01 was checked again. Batch 3 remains on hold.
- 2026-11-09: The human replied "proceed" after reviewing the remaining T04 work, approving Batch 3 dispatch and independent review. T04's final focused run passed 3 suites/59 tests; the full run passed 41 suites/738 tests with 3 suites/3 tests skipped; build, isolated demo Firestore C1 assertion, and synthetic-session headless Chrome 320px/keyboard inspection passed. Independent review and re-review closed finding T04-W1 with final T04 and combined verdicts of pass. The completion manifest passed validation, and T04 was checked. Commit and merge remain human gates.
