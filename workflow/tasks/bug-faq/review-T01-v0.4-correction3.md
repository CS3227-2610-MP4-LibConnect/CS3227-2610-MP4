# Independent review: T01 correction revision 3

## Verdict

**Changes required; revision 3 itself could not be verified from the supplied snapshot.** The designated snapshot is still revision 2: its manifest has `correctionDispatch.revision: 2`, and the revision-3 correction report is absent. I did not run the tests there because they would exercise revision 2 rather than the requested correction. In the snapshot's unchanged API route, a separate explicit cursor-validation integration risk is reproducible by inspection: non-Timestamp search/reply boundaries emitted by the revised store are rejected before reaching it.

The orchestrator should provide a refreshed revision-3 snapshot for the store/test re-review. The API cursor validator issue also needs resolution or an approved, demonstrably safe mitigation before the combined Batch 1 behavior can be considered complete.

## Scope and evidence

- Read the reviewer profile, approved v0.4 spec/checklist/handoff, current-state, and assignment manifest under `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04`.
- Read the T01 review history and inspected the files present for FAQ cursor handling.
- The requested `implementation-T01-v0.4-correction3.md` is absent. The manifest reports correction revision 2, not 3. The FAQ store and store tests present are therefore not established as the revision-3 overlay.
- Assignment plan validation: `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed, but it validates the revision-2 manifest only.
- No production, tests, spec, checklist, handoff, or manifest files were changed. Revision-3 focused and combined test commands were not run against the stale snapshot.

## Required integration finding

### High — API cursor validation rejects non-Timestamp store cursors

**Location:** `src/codeclinic/server/tickets/faq-routes.js:25-34,103-111,141-151`.

The store's cursor revision supports tagged GeoPoint, map, array, bytes, reference, and special-number values (as described in the revision-2 report). The API's `validSearchCursor` still requires `createdAt` to be an untagged `{seconds, nanoseconds}` timestamp-parts object. The search route decrypts a supplied cursor and applies this validator before calling `store.searchFaq`; a valid session-bound cursor for a malformed non-Timestamp `createdAt` therefore receives 400 and cannot continue. `validReplyCursor` has the same Timestamp-only assumption, so reply continuation has the analogous limitation. This is the unresolved `faq-routes.js` integration risk identified by the implementer and lies outside the revision-3 store/test overlay.

Update the API validators to accept the same bounded, typed cursor boundary contract as the store, or otherwise ensure the store never emits a boundary that the API will reject while preserving progress. Add API-level continuation tests for at least GeoPoint and map boundaries, plus an equivalent reply cursor test if the store can emit non-Timestamp reply boundaries. Do not treat a store-only pass as end-to-end continuation evidence while this remains.

## T01 revision-3 criteria not verified

Because the required overlay was not present, I could not independently verify the revision-3 implementation for cross-database `DocumentReference` roundtrip, oversized/unencodable boundary handling, Firestore type reconstruction, or the revised regressions. No verdict on those code changes is implied here. The previous revision-2 findings remain the context for those checks, not a substitute for review of revision 3.

## Checks

- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed for the revision-2 manifest.
- Focused T01 tests — **not run**: only revision-2 files were present, so running would not verify the requested change.
- Combined T01/T02 regression tests — **not run** for the same snapshot mismatch.
- Read-only inspection confirmed the API route's Timestamp-only search and reply cursor validators described above.

## Unresolved risks

- Refresh the snapshot with the exact revision-3 store/test overlay, updated correction report, and manifest before reviewing the requested T01 fixes.
- The API cursor validator integration issue must be addressed or covered by an explicitly approved contract decision and integration evidence; this review did not change route code.
- Production index readiness remains unverified and out of scope.
