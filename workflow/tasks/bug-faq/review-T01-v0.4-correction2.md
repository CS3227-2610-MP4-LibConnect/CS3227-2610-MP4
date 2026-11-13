# Independent review: T01 cursor type correction, revision 2

## Verdict

**Changes required.** Revision 2 correctly preserves Timestamp, GeoPoint, ordinary maps (including a map shaped like timestamp parts), arrays/maps recursively, bytes, and supported non-finite numeric values in the cursor representation. The 100-document GeoPoint and map regression cases pass. Two pagination risks remain: reference cursor reconstruction drops the source database identity, and allowed cursor values can exceed the token-size limit, causing the store to return no continuation even when more records remain.

## Scope and evidence

- Reviewed the refreshed isolated snapshot at `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04`: v0.4 approved spec/checklist/handoff, original T01 finding, revision-1 review finding, revision-2 correction report, updated manifest/current-state, `faq-store.js`, store contract tests, token helper, and installed Firestore SDK serializer/query sources.
- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed. Manifest records a scoped revision-2 T01 correction; checklist T01 remains unchecked.
- The implementation log named in the correction report was not in the snapshot. Tests were independently rerun. No live implementation copy was used.
- No production, test, spec, checklist, handoff, or manifest files were changed.

## Acceptance trace

| Criterion | Evidence and result |
| --- | --- |
| Exact resolved-only query, createdAt descending/document ID ascending, scan limit 100, match limit 20 | `faq-store.js:87-93`; store and index contract tests. Pass. |
| Search cursor is opaque, session/query/field-bound, and authenticated-encrypted | Existing token codec and `faq-store.js:74-84,105-113`; token contract tests. Pass. |
| Timestamp values survive token roundtrip | `timestampParts` now requires Firestore `Timestamp` or valid `Date` (`faq-store.js:15-25`); cursor timestamps are reconstructed. Existing tests pass. |
| GeoPoint and map values survive continuation | `faq-store.js:55-61,46-53`; full-batch tests at `bug-faq.store.contract.test.js:152-204` assert GeoPoint reconstruction and map-shaped seconds/nanoseconds remain a map. Pass for these cases. |
| Arrays/maps, bytes, reference values, and non-finite numbers are tagged/reconstructed | `faq-store.js:46-53,64-85`; code paths exist, but tests do not exercise arrays, bytes, reference paths, or special numbers. Reference identity issue below; others remain unverified. |
| Token size bounds preserve continuation | The token helper caps encoded token length at 512 and payload length at 2048. The store accepts larger cursor structures than those caps and silently returns `nextCursor: null` if sealing fails. Finding below. |
| Detail reply cursor preserves these value types | It uses the same ordered-boundary encode/decode helpers (`faq-store.js` in `getFaqDetail`); no malformed reply timestamp regression covers special types. Not verified for those types. |

## Findings

### Medium — cross-database reference values lose database identity

**Location:** `src/codeclinic/server/tickets/faq-store.js:73-75,87-91`.

Reference encoding stores only `DocumentReference.path`; decoding calls `db.doc(path)`. The installed Firestore SDK's `DocumentReference.toProto()` uses `formattedName`, which includes project and database identity, while `.path` is only the document path. A reference-valued malformed `createdAt` originating from a different database is therefore reconstructed as a reference in the current database. It has the same Firestore value type but a different ordered reference value. If it is the last item of a full page, `startAfter` can land at the wrong position and repeat or skip records. The correction report explicitly leaves cross-database reference ordering untested.

Preserve the complete qualified reference identity and reconstruct it faithfully, or reject/handle such reference boundaries with a continuation strategy that still advances. Add a test using a reference with a different project/database identity and verify the value passed to `startAfter` matches it. If the SDK cannot construct that reference safely, document and implement a safe boundary strategy instead of assuming `.path` suffices.

### Medium — accepted cursor values can exceed the token cap and silently end pagination

**Location:** `src/codeclinic/server/tickets/faq-store.js:46-53,64-85,105-113`; `src/codeclinic/server/tickets/faq-token.js:3,56-74`.

`isValidBoundaryValue` allows up to 100 map entries at each level and keys/strings without a size bound; byte data allows 2048 characters. Those accepted values can make the encrypted payload exceed the codec's 2048-byte payload cap or 512-character external token cap. `sealFaqToken` then returns `null`; search stores that as `nextCursor: null` and returns the page as exhausted even though the query had 100 documents. This makes later matches unreachable for a large malformed map/bytes/reference boundary.

Align cursor-boundary validation with the actual encrypted-token size budget and ensure an unencodable boundary cannot be reported as exhausted. Add upper-bound tests that exercise large maps, keys, nested arrays, and bytes at/over the cursor limits and verify the caller either receives a valid advancing cursor or a safe explicit failure, never a successful terminal page while more records remain.

## Checks

- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed.
- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — **3 suites passed, 46 tests passed**.
- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — **8 suites passed, 161 tests passed**.

## Unverified criteria and risks

- No Firestore emulator was used. Synthetic tests assert object reconstruction but do not ask Firestore to validate/sort actual cursors for each special value type.
- Arrays, bytes, reference identity, special numeric values, and malformed reply ordering lack direct contract tests; the two findings above require correction for reference and token-size behavior.
- Production index readiness remains outside T01 review.
