# Bug FAQ T01 correction report — v0.4, revision 2

Status: **Correction complete; ready for independent re-review**

Specification: approved `workflow/specs/bug-faq.md` v0.4. Scope: revision-2 `correctionDispatch` in `workflow/tasks/bug-faq/assignment-batch-1.json`. This correction preserves the prior implementation and review evidence.

## Finding addressed

Revision 1 preserved malformed scalar values, but a Firestore GeoPoint was converted to an ordinary object by JSON token serialization. Passing that map to Firestore `startAfter` changes the ordered value type and may prevent continuation from advancing. A plain map with `seconds` and `nanoseconds` also must remain a map rather than becoming a Timestamp.

## Correction

- Search/reply cursor values now use a bounded, encrypted, type-tagged representation for Firestore ordered values that JSON alone cannot preserve. The store reconstructs `GeoPoint`, `Bytes`, document references, arrays, maps, non-finite numbers, and timestamps as SDK-compatible query values after token decryption. Primitive values remain primitive. Maps are represented explicitly as map entries, so their keys cannot collide with the internal type tag.
- Timestamp conversion now recognizes Firestore `Timestamp` and valid `Date` instances. A regular map with `seconds` and `nanoseconds` is encoded as a map and is not converted to a Timestamp.
- Existing ticket ID, `createdAt` cursor field, token purpose/version, session/query binding, status filter, scan limit, and result limit are preserved.
- Added a full 100-document scan ending in a GeoPoint boundary; its continuation reconstructs a GeoPoint and reaches a valid matching record on the next page. Added a matching continuation test for a map shaped like timestamp parts. Revision-1 malformed-string tests remain in place.

## Acceptance status

- GeoPoint ordered-value type survives token sealing/opening and advances the next page: **Met in synthetic store contract test**.
- A map with `seconds`/`nanoseconds` remains a map and is not reinterpreted as Timestamp: **Met in synthetic store contract test**.
- Earlier malformed-string boundary cases, resolved-only status, bounds, and session/query-bound token behavior: **Preserved; all focused suites pass**.

## Verification

Exact command and outcomes are in `logs/tasks/bug-faq/implementation-T01-v0.4-correction2-2026-11-12.md`. Final focused result: **3 suites passed, 46 tests passed**. Final `git diff --check` passed.

## Scope and remaining risk

Only `src/codeclinic/server/tickets/faq-store.js` and `src/codeclinic/test/bug-faq.store.contract.test.js` were changed for this correction. Tests use synthetic Firestore query doubles; no emulator or live database was used. Deployed index readiness remains unverified. Reference ordered values are reconstructed against the current Firestore client from their document path; cross-database reference ordering was not tested. Independent re-review is required. No checklist update or Batch 2 work was performed.
