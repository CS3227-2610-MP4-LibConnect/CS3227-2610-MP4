# Independent review: T01 correction revision 3 (refreshed snapshot)

## Verdict

**Pass with follow-up.** The store correction addresses the revision-2 cross-database reference and cursor-size findings: reference boundaries now retain project/database/path identity, and unencodable boundaries fail explicitly rather than returning a successful page that appears exhausted. The new tests cover these cases. The previously reported `faq-routes.js` cursor validator mismatch is confirmed and remains a required integration follow-up before the API can continue from non-Timestamp boundaries.

## Snapshot and approval verification

- Reviewed distinct snapshot `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-r3`, assembled from the prior isolated clean-HEAD/revision-2 snapshot plus the exact revision-3 store, store test, correction report/log, manifest, and current-state overlays. Dependencies are junctioned to the workspace.
- Verified `assignment-batch-1.json` has `correctionDispatch.revision: 3` and `implementation-T01-v0.4-correction3.md` exists before reviewing. The v0.4 spec, checklist, and handoff remain approved; T01–T04 remain unchecked.
- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed.
- Preserved the earlier stale-snapshot report/log. This report records the actual revision-3 review.

## T01 criteria trace

| Criterion | Evidence and result |
| --- | --- |
| Resolved-only query, createdAt descending and document ID ascending, 100-document scan and 20-result cap | `faq-store.js` query and scan loop retain the `RESOLVED` constraint and bounds; store/index tests pass. Pass. |
| Cursor boundary serialization preserves relevant Firestore types | Timestamp/Date, GeoPoint, Bytes, DocumentReference, arrays/maps, and non-finite numbers have explicit encode/decode paths. Ordinary maps are represented as entries so timestamp-shaped maps remain maps. SDK serializer uses typed encoding for GeoPoint, Bytes and DocumentReference; its `startAfter` accepts field values through the query serializer. Pass by code inspection and unit tests where covered. |
| Cross-project/database DocumentReference identity | `faq-store.js` encodes project ID, database ID, and path, then reconstructs a source-identity reference if needed. Full 100-document test asserts reconstructed project/database/path and reaches the next matching page. Pass in synthetic store test. |
| Oversized/unencodable boundary cannot masquerade as exhausted | Unsupported values and failed token sealing raise `CURSOR_UNENCODABLE`; search/reply paths do not return null cursors in those cases. Full-batch tests cover a 101-entry map, oversized key, nested array, and bytes. Store/API catch path returns a generic 503 with no-store, not a false successful empty/exhausted page. Pass. |
| Previous malformed string, GeoPoint and map-shaped seconds/nanoseconds regressions | Tests retain string-at-beginning/end full-batch cases, GeoPoint full-batch continuation, and ordinary map continuation. Pass in synthetic store tests. |
| Session/query binding and token opacity | Unchanged token context still binds current trusted session `idHash`, Student, purpose, normalized query and field; focused token tests pass. Pass. |

## Integration finding

### High — API still rejects valid tagged non-Timestamp continuation cursors

**Location:** `src/codeclinic/server/tickets/faq-routes.js:25-34,103-111,141-151` (unchanged from the supplied revision-3 snapshot).

`validSearchCursor` and `validReplyCursor` accept only Timestamp-parts objects. The route decrypts a cursor and applies those validators before invoking the store. A revision-3 store cursor carrying a GeoPoint, map, reference, array, bytes, or special-number tag therefore fails API validation with 400; the store cannot resume it. The implementation correction report/log explicitly identify this as outside the authorized store/test scope. Large/unencodable values instead throw in the store and reach the generic no-store 503 catch, which is safe, but successful typed continuation remains unavailable through HTTP.

The orchestrator should dispatch a separately scoped T02/API correction to align cursor payload validation with the store's bounded tagged-value contract, or constrain the store/API contract together so no valid emitted cursor is rejected. Add HTTP continuation tests for representative GeoPoint/map boundaries and reply cursors. Until then, the combined T01/T02 feature remains incomplete even though this T01 store correction passes.

## Unverified criteria and risks

- The DocumentReference roundtrip is tested with synthetic Firestore query doubles; no emulator/live query confirms cross-database reference pagination. The installed SDK serializer/query implementation was inspected, and the reconstructed reference preserves full identity/path.
- Direct successful roundtrip tests do not cover every type path (notably successful arrays, byte values, and NaN/±Infinity), although the implementation paths and validation are present. Oversize array/bytes cases are tested as failures.
- T01 detail reply cursor pagination does not test malformed non-Timestamp reply `createdAt` values end-to-end; it shares the store codec but the API validator has the integration restriction above.
- Production index deployment remains outside this review.

## Checks

- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed.
- `$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — **3 suites passed, 51 tests passed**.
- `$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — **8 suites passed, 166 tests passed**.
- The `CI=true` setting made Jest terminate deterministically in the isolated snapshot.
