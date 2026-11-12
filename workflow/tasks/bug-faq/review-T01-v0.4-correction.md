# Independent review: T01 malformed-boundary correction (v0.4)

## Verdict

**Changes required.** The correction advances through malformed string values at both tested scan edges and preserves the existing resolved-only query, bounds, and token bindings. It does not preserve the Firestore type of all JSON-serializable malformed values. A Firestore `GeoPoint` in `createdAt` is tokenized as a plain latitude/longitude object and restored as a map for `startAfter`, which changes the ordering type and can repeat the same batch instead of advancing. That leaves the original continuation risk open for a supported Firestore value type.

## Scope and evidence

- Reviewed the refreshed isolated snapshot at `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04`: approved v0.4 spec/checklist/handoff, original review finding, correction report, updated batch manifest, corrected `faq-store.js`, and store tests.
- The correction report is present. The correction execution log named in the manifest is not present in this snapshot; test execution was independently repeated here. No live implementation copy was consulted.
- Confirmed `assignment-batch-1.json` keeps T01/T02 v0.4 and records a scoped correction dispatch for T01. T01 remains unchecked in the checklist; this report does not change it.
- Inspected the installed Firestore SDK's `serializer.js` and `reference/query.js` cursor encoding: `GeoPoint` is encoded through its typed `_toProto()` path, while a plain object is encoded as a `mapValue`. Firestore orders those as distinct value types. A plain object cursor therefore does not reproduce a GeoPoint cursor.
- No production, test, approved planning, or manifest files were changed.

## Correction trace

| Criterion | Evidence and result |
| --- | --- |
| Advance past malformed string `createdAt` at beginning and end of a full 100-document scan | Corrected test cases in `bug-faq.store.contract.test.js:117-149` check the 100-doc scan, opaque continuation, exact end boundary, and the following matching page. Pass for strings. |
| Preserve raw ordered boundary values in encrypted cursor and restore for `startAfter` | `faq-store.js:46-60,96-101`; strings are preserved and timestamp parts reconstructed. Incomplete for Firestore special values; see finding. |
| Keep status constraint, sort order, 100 scan limit, and 20 result limit | `faq-store.js:87-93`; existing store/index tests. Pass. |
| Keep session/query-bound encrypted search cursor | Cursor opened and sealed with the same trusted `idHash`, Student and normalized query/field binding (`faq-store.js:75-84,105-113`); token tests pass. Pass. |

## Finding

### Medium — cursor serialization changes Firestore `GeoPoint` ordering type

**Location:** `src/codeclinic/server/tickets/faq-store.js:46-60,96-101`.

`orderedBoundaryValue` returns an unrecognized object unchanged. The token codec canonicalizes object properties into JSON, so a Firestore `GeoPoint` becomes a plain object with latitude/longitude properties. On the next request, `queryBoundaryValue` also returns that plain object. The installed Firestore SDK serializes this as a map value, whereas the original was a GeoPoint value. `startAfter` therefore positions against a different type in the ordered query; if the page ended on such a malformed record, it can fail to advance past that record/value group and repeat results. The new tests exercise only malformed strings, so they do not catch the type conversion.

This leaves T01's malformed-data continuation requirement incomplete. Preserve the Firestore type in the opaque cursor (including GeoPoint and any other supported non-timestamp ordered values), or use a cursor representation that cannot alter the value type. Add a regression with a GeoPoint `createdAt` at the end of a full batch, assert the restored cursor remains a GeoPoint for `startAfter`, and prove the next batch reaches a valid timestamped match without replay. A map with `{seconds, nanoseconds}` is also useful to confirm maps are not reinterpreted as Timestamp instances.

## Checks

- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — **3 suites passed, 44 tests passed**.
- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — **8 suites passed, 159 tests passed**.

## Unverified criteria and risks

- Firestore integration/emulator pagination with malformed non-timestamp values was not run. The SDK type encoding was inspected locally; the identified type mismatch is not covered by synthetic query mocks.
- Index deployment and production readiness are outside this review; the query/index shape and regression tests remain unchanged.
