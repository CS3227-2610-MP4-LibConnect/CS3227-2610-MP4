# Bug FAQ T01 correction report — v0.4

Status: **Correction complete; ready for independent re-review**

Specification: approved `workflow/specs/bug-faq.md` v0.4. Correction dispatch: approved scoped T01 correction recorded in `workflow/tasks/bug-faq/assignment-batch-1.json` under `correctionDispatch`; finding and review scope are documented in `review-T01-v0.4.md`.

## Finding addressed

The reviewer found that a resolved ticket with malformed `createdAt` was skipped without becoming the continuation boundary. This could leave later matching tickets unreachable, especially when malformed records filled or ended a 100-document scan.

## Correction

- Search now records an ordering boundary for every scanned document with a valid ticket ID, even when `createdAt` is not a Timestamp. Valid Firestore timestamps continue to use the existing seconds/nanoseconds representation. Other JSON-representable ordered values are retained as the cursor's `createdAt` value and passed back to Firestore `startAfter` with the document ID.
- Cursor validation accepts a bounded JSON boundary value; malformed payload shapes remain rejected. The token remains encrypted, session/query-bound, version 1, and carries the same ticket ID and `createdAt` fields.
- Added store-contract cases for malformed string `createdAt` at the beginning and at the end of a full 100-document batch, followed by a valid matching ticket. Both assert that the first page returns a continuation and the next page reaches the match. The end case verifies the malformed string and its document ID are used as the `startAfter` boundary.

## Acceptance status

- Malformed timestamps do not prevent continuation past scanned documents: **Met for the tested malformed string values at both batch edges**.
- Existing resolved-only query, scan/result bounds, ordering, match behavior, and session/query token binding: **Preserved; focused store, token, and index suites pass**.

## Verification

Exact command and outcomes are recorded in `logs/tasks/bug-faq/implementation-T01-v0.4-correction-2026-11-12.md`. Final focused result: **3 suites passed, 44 tests passed**. Final `git diff --check` passed.

## Scope and remaining risk

Only `src/codeclinic/server/tickets/faq-store.js` and `src/codeclinic/test/bug-faq.store.contract.test.js` were changed for this correction. Other malformed Firestore value types were not exercised in an emulator; tests use synthetic ordered query results. Production index readiness remains unverified. The previous T01/T02 implementation and review reports were preserved. Independent re-review is required; no checklist item was marked complete and Batch 2 has not started.
