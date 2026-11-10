# Implementation checklist: student-tickets

Version: 0.3 (2026-11-09 UI follow-up directed in conversation)
Task ID: `student-tickets`
Specification: `workflow/specs/student-tickets.md` v0.4, UI follow-up directed 2026-11-09 in the conversation
Approval state: T01–T04 were approved, implemented, and independently reviewed under the earlier artifact versions. The human directed execution of the scoped T05 follow-up and preservation of the current navbar button order. Commit and merge remain separate decisions.

This checklist covers ticket creation only. The human approved the shared-contract reconciliation proposal v0.3 and specification v0.3. Checkboxes are updated by the orchestrator only after independent review. Original task wording from approved v0.1 is retained below; additional v0.2 criteria follow each affected item.

- [x] **T01 — Ticket create API and persistence.** Add the bounded `POST /api/tickets` request contract, session-backed active Student authorization, CSRF check, allowlisted fields, server-chosen ID, `OPEN` state, server timestamps, and safe `201`/error responses. Store optional files or repository references without fetching a URL. Test visitor and TA denial, forged fields, malformed and oversized bodies, storage failure, and no persisted Notification. (Spec R4; scenarios 4, 6–8, 11–12.)

  v0.2 addition: Use exact request names `files` and `repoFilePaths`; validate the seven fixed language choices, 0–5 normalized concept tags, and revised title/detail/repository limits. Store the complete C1 document at `tickets/{ticketId}` with Firestore `Timestamp`s and specified null/empty initial values. Verify the endpoint has no access to later state transitions or replies. (Spec v0.3 R4; scenarios 14–15.)

- [x] **T02 — Protected create route and form.** Add `/student/tickets/new` to the existing frontend and server deep-link routing. Use server session validation before rendering the form, with sign-in redirect and TA denial. Build the labeled form for required and optional fields, bounded client validation, accessible errors and pending state, safe plain-text treatment, and failure preservation. Test direct entry and refresh, validation, duplicate submit, failures, and keyboard and 320-pixel layout. Depends on T01's approved request contract. (Spec R2–R3, R6; scenarios 3–5, 9, 11, 13.)

  v0.2 addition: Use only the seven fixed language choices with no manual value, show the `Other` explanation below the selector, apply five-tag normalization and the revised length limits, and submit `files`/`repoFilePaths`. (Spec v0.3 R3–R4; scenarios 14–15.)

- [x] **T03 — Entry points and success feedback.** Add the `Ask for Help` dashboard section and Student-only header `Create Ticket` action. After a verified `201`, navigate to the Student dashboard and show transient success feedback; keep failures on the form. Test both links, TA absence, success and malformed responses, and no premature success. Depends on T02. (Spec R1, R5; scenarios 1–2, 9–10.)

- [x] **T04 — Integration verification and guides.** Run focused tests, full project tests, build, and emulator-backed storage integration with synthetic data. Inspect keyboard and 320-pixel behavior. Update User Guide and Developer Guide for the shipped create flow, and record implementation and security evidence. Depends on T01–T03. (Spec verification matrix.)

  v0.2 addition: Verify C1 shape, Firestore `Timestamp` fields, null/empty initial values, no browser collection access, the fixed language selector, tag normalization, and the revised limits in both UI and API evidence.

- [x] **T05 — Member header and language placeholder follow-up.** Show the shared authenticated header on the verified Student create-ticket page without changing header action order. Keep authenticated navigation hidden during session checking and denial. Start the language selector on a disabled empty placeholder, then prevent reselecting it. Add focused route/form tests, run focused tests and build, and obtain independent review. (Spec v0.4 R3, R6.)

## Approval boundaries

Specification v0.3, this checklist v0.2, and `handoff.md` v0.2 are human-approved in separate conversation turns. Obtain approval of a revised batch plan and implementation dispatch before production changes. Each batch receives independent review before the next starts. Commit and merge decisions remain human gates.

## Amendments

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
