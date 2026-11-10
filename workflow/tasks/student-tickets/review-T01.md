# T01 independent review: ticket create API and persistence

Task: `student-tickets`, Batch 1, T01  
Reviewed artifacts: specification v0.3, checklist v0.2, handoff v0.2, assignment batch 1, human-approved batch plan v0.2  
Implementation report: `workflow/tasks/student-tickets/implementation-T01.md`  
Execution log: [review-T01.md](../../../logs/tasks/student-tickets/review-T01.md)

## Verdict

**Revised verdict: pass (2026-11-09).** The initial review was pass with follow-up due to a low-severity Unicode character-count inconsistency. The approved correction now uses a consistent Unicode code-point count for the affected character limits, and focused boundary tests pass. See the dated correction re-review below. The original review finding and environment limitations remain documented for audit history.

## Acceptance criteria trace

| T01 criterion | Review result |
| --- | --- |
| Visitor and TA cannot create tickets; current account must be active Student | Satisfied in `route.js`; tests cover visitor, TA, inactive account, and changed role. Session identity is obtained from the established cookie authenticator. |
| CSRF is required | Satisfied in `route.js`; tests cover missing and incorrect token. Hash comparison validates both hashes and uses `timingSafeEqual`. |
| Forged identity, state, claim, resolution, and timestamp fields cannot control storage | Satisfied by the exact request allowlist in `validation.js`; forged-field test confirms 400 and no write. |
| Required fields, fixed language list, normalized tags, source exclusivity, file/path/repository constraints | Satisfied by `validation.js` on inspection; tests cover required whitespace, language, limits, normalized duplicate tags, files, source exclusivity, and repository paths. |
| Malformed and oversized JSON receive safe errors | Satisfied by the route-local 128 KiB parser and error middleware; tests cover malformed JSON, oversized body (413), and a valid 24 KiB file. |
| Exactly one C1 `OPEN` document with server ID/owner, Firestore Timestamps, and null/empty initial values | Satisfied by `store.js`; API and isolated storage tests assert document path, full field set, ownership, timestamps, and empty/null values. |
| Storage failure returns safe 503 without misleading success | Satisfied by route catch and failure test; response omits internal error and ticket content. |
| No create Notification, reply write, later transition, or repository fetch | No such code path is present in the inspected endpoint/store. Tests assert no notification; storage test asserts exactly one document write. No network access is imported or invoked. |
| Existing login/account body limits remain intact | Mount order keeps the ticket parser ahead of the existing login app; relevant server, account, login, and session regression tests passed. |

## Findings

### LOW — Unicode length limits count UTF-16 code units in some fields

**Location:** `src/codeclinic/server/tickets/validation.js:60`, `:71`, `:88`.

Required ticket text uses `characterLength()` (Unicode code points), while filenames, repository URLs, and aggregate repository paths use JavaScript `.length` (UTF-16 code units). For example, a filename containing 61 emoji is 61 Unicode code points but 122 UTF-16 code units and is rejected against the 120-character maximum. The same mismatch can reject repository references below the documented character limit. This is a restrictive false rejection rather than an authorization or storage-boundary bypass.

**Recommended action:** Apply one consistent character-count helper to all limits specified in characters; retain `Buffer.byteLength(..., 'utf8')` for file content, whose limit is explicitly in bytes. Add focused boundary coverage for supplementary Unicode characters.

## Review environment and limitations

The assignment designates `separate-clean-review-checkout`, but the available `.review/student-tickets-b1` checkout is clean at the preimplementation baseline commit. The implementation files are uncommitted/untracked in the shared workspace, so no implementation commit exists to check out. I did not alter production files. As compensating controls, I inspected the full modified server wiring and each new ticket module and test directly, checked the complete visible working-tree status/diff scope, and ran the focused tests from the same source snapshot. The independent-checkout constraint therefore remains a process limitation; the reviewed source snapshot is the current implementation supplied for T01.

No criteria were omitted from the review. No review-only tests or production changes were added. The `@google-cloud/firestore` Timestamp import resolves in the installed dependency tree as a dependency of `firebase-admin@14.5.0`; it is an indirect dependency and remains a maintenance consideration, but no dependency or lockfile change was made in this batch.

## Correction re-review — 2026-11-09

The human approved the scoped T01 character-count correction and independent re-review. I inspected the updated `validation.js` and `student-tickets.api.test.js` against specification v0.3, checklist v0.2, and T01's R4 criteria. `characterLength()` now consistently counts Unicode code points for filenames (120), repository URLs (255), and the aggregate repository paths (5,000); the explicitly byte-based file content limit still uses UTF-8 byte length.

Boundary tests now reject 121-character filenames, 256-character repository URLs, and 5,001-character aggregate paths made from supplementary Unicode characters, while accepting values at the respective 120, 255, and 5,000 character limits. This resolves the original LOW finding. The changed count logic does not alter authorization, input allowlists, path checks, body size enforcement, or persistence behavior. No new finding was identified.

**Revised T01 verdict: pass.** The focused API/storage suite passed 2 suites and 45 tests. The earlier clean-checkout limitation still applies: the named review checkout remains at baseline while implementation files are uncommitted in the shared workspace. The correction was re-reviewed directly from the current source snapshot; no production code was modified by the reviewer. Exact command and result are in the appended execution log section.
