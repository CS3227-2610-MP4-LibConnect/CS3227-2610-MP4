# Independent review: Batch 6

Reviewed artifacts: specification v0.5, checklist v0.4, handoff v0.4, and batch plan v0.3. Assignment: Batch 6, T06 followed by T07. The dispatch proposal records separate human approval of the batch dispatch. The assignment names a different implementer and reviewer. Because the implementation is uncommitted in the shared workspace, review provenance is limited to the exact current scoped diff and files; a separate worktree was unavailable.

## Review amendment: source-error focus fix

The implementer replaced the detached filename ref with `codePickerRef`, attached it to the Code files input, and added a regression assertion in the file/repository conflict test. I independently inspected the exact new diff and confirmed that a source conflict with accepted files now focuses the picker; the test also checks its `aria-invalid` and `aria-describedby` state. The low-severity follow-up from the initial review is resolved.

I reran `npm test -- --watchAll=false --runInBand StudentTickets.test.tsx` from `src/codeclinic`: **pass**, 1 suite and 20 tests. Existing dashboard/notification React `act(...)` console warnings and the Node `punycode` deprecation warning remain non-failing.

The human's browser check was reported passed before this small focus-ref fix. A second 320 × 640 browser pass is not needed to assess this correction: the change only wires the already visible picker as the source validation focus target, with a regression assertion verifying focus, and does not alter responsive layout, picker behavior, errors, chat, or submit placement. The browser result remains explicitly human-reported and predates this correction.

## T06 verdict: pass

The Create Ticket picker replaces manual filename/content controls. It checks the selected file count, basename, and `File.size` before reading; reads as bytes; rejects malformed UTF-8 through strict `decodeURIComponent` decoding; and applies a selection only after all selected files read successfully. Rejected selections retain prior files. Accepted metadata is rendered as text and removal updates the form's in-memory file list. The outgoing ticket shape remains `{ filename, content }`; size metadata is not serialized. The JSON 128 KiB client check, repository source exclusivity, and server API/authorization implementation are unchanged. Pending reads block direct form submission and the create-page help-chat send callback synchronously, with submit/file-picker UI disabled while reading. Deterministic held-FileReader coverage exercises the pending guard.

Unverified criteria: actual browser behavior was not observed by this reviewer. The orchestrator reports that the human checked the required 320 × 640 viewport and reported success for selection, metadata, removal, oversize rejection, focus, overflow, chat visibility, and submit usability; this remains human-reported evidence only.

## T07 verdict: pass

Both guides describe local UTF-8 file selection, the three-file and 24 KiB bounds, metadata/removal, rejection and retention behavior, pending-read guards, the existing JSON field, and client/server request limits. The Developer Guide states that client checks are early feedback and that the server independently enforces its validation. I found no documentation claim that introduces storage, upload, provider, or API behavior outside the approved contract.

## Combined diff and security review

The implementation diff changes only the approved Create Ticket UI/style, shared Student chat send guard, focused ticket/chat UI tests, and the two guides. The existing server validation, routes, AI gateway, Firestore schema, API tests, package files, and deployment configuration are unchanged. The file content remains page-local; code renders only file metadata, does not create object URLs, and the reviewed diff adds no browser storage or logging of file content. The unchanged API continues to receive the existing JSON `files` shape and enforces authorization, CSRF, size, file count, and source exclusivity. Chat uses the existing endpoint and guards only the create-page send path while a read is pending. No higher-severity security, authorization, concurrency, atomicity, or scope findings were identified.

The implementation and tests cover UTF-8 selection, invalid encoding, oversized file, invalid basename, count cap, prior-file retention, removal, source exclusivity, request size, payload shape, and pending ticket/chat suppression. No API/auth server test code changed. No review-only test files were added.

## Conclusion

**pass.** T06 and T07 meet their scoped functional and security requirements, and the required focused suites pass. The source-error focus issue found in the first review was corrected and independently verified by test. Human browser/keyboard checks are recorded as reported, not independently verified; the reported check predates the focus-only correction. No checklist status was changed. See [review-batch-6.md](../../../logs/tasks/student-tickets/review-batch-6.md) for exact commands and results.
