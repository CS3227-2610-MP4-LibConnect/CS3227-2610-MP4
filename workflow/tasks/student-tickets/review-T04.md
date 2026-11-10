# Independent review: T04 integration verification and guides

Task: `student-tickets`, Batch 3, T04  
Approved contract: specification v0.3, checklist v0.2, handoff v0.2  
Review basis: exact current shared-workspace files; Batch 3 assignment discloses the shared-workspace separation exception.  
Implementation and review were performed by different agents.

## Verdicts

- **T04: pass with follow-up.** The required guides, tests, C1 emulator assertion, and retained browser evidence meet the approved T04 criteria. One low-severity hardening issue remains in the test-only browser inspection server. The CUA browser surface is unavailable in this session, so I could not repeat the browser run interactively.
- **Combined student-ticket change (T01–T04): pass with follow-up.** The focused UI/API/storage suite and isolated emulator assertion passed independently. The retained full-suite and build logs pass, and the earlier T01 correction review records the registration regression fix and independent focused rerun. No ticket authorization or persistence defect was found in the inspected implementation. The path-containment follow-up applies only to the local inspection harness.

## T04 criteria trace

| Criterion | Review result and evidence |
| --- | --- |
| Focused UI, API, and storage verification | Independently ran `npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api student-tickets.storage`: 3 suites and 59 tests passed. UI test covers the seven fixed language values, `Other` guidance, normalized padded-uppercase tags, the five-tag cap, client limits, and safe failure behavior. The API suite covers the language allowlist, tag normalization and duplicates, size limits, request fields, and authorization/error cases. |
| Full project tests and build | Reviewed retained final logs: full test run reports 41 passing suites, 738 passing tests, 3 skipped suites and tests; optimized production build compiled successfully. T04 changed documentation, test code, and verification scripts only. |
| C1 document, Timestamp, and null/empty values | Independently reran the emulator command recorded below. It passed exact-key, owner, `OPEN`, Timestamp, null/empty values, one-ticket-write, unchanged-notification-count, and synthetic-record-deleted assertions against the local demo emulator. |
| Browser has no ticket collection access | Inspected `TicketCreatePage.tsx`: it uses `/api/auth/csrf` and `POST /api/tickets`; no browser Firestore SDK or collection access. The server router and store own authorization and writes. |
| Keyboard and 320 CSS-pixel behavior | Reviewed `browser-inspection.js`, its retained JSON/log, and both screenshots. The recorded Chrome run reports viewport/document/body width 320, no horizontal overflow, controls within the viewport, Tab reaching title and submit, and Space-submit focusing the first invalid field with an associated error. Screenshots show no visible clipping. The browser server stubs session, CSRF, and create responses; this demonstrates UI behavior only. CUA inventory during this independent review returned `Browsers: Error: The browser access host is unavailable`, so I could not repeat the live browser run. |
| User and Developer Guides | Reviewed both exact diffs. The User Guide explains the Student entry points, required/optional content, source choices, success and failure behavior, and marks viewing/editing/replies/TA workflows unavailable. The Developer Guide documents the protected page, HTTP/server trust boundary, C1 storage shape, no repository fetch, no persisted notification, and focused verification locations. |

## Combined implementation and security review

Inspected the ticket route, validation, Firestore store, create page, route guard, server mounting, and registration correction plus its regression test. Session identity and active Student status are checked server-side; CSRF is enforced; input is allowlisted and bounded; owner, document ID, state, and timestamps are server-controlled. The write is a single create-only C1 `OPEN` record and does not create replies, transitions, notifications, or outbound repository fetches. The browser submits only through the API. No production authorization, data exposure, or scope-expansion finding was identified.

The final full-suite log reports the registration and ticket suites passing. The separate T01 correction re-review documents the malformed-registration parser/guard ordering correction and its 6-suite/126-test independent focused rerun. That review found no remaining T01-W1 issue. The T04 final suite log includes 41 passing suites and 738 passing tests, with 3 skipped.

## Finding

### T04-W1 — Low: local inspection server path-prefix containment check

**Location:** `src/codeclinic/test/browser-inspection-server.js`, static-file candidate containment check.  
**Evidence:** The harness resolves the requested file beneath `build` and checks `candidate.startsWith(root)`. This is a string-prefix test; a resolved sibling such as `build-private/secret` begins with the `build` root string and can pass even though it is outside the build directory. The script binds to loopback and is test-only, which limits exposure, but it should serve files only from the build root.  
**Recommended action:** Use `path.relative(root, candidate)` and reject when the relative result is `..`, begins with `..${path.sep}`, or is absolute. Add a focused harness-level check if this server remains in use.

This finding does not block T04 acceptance because the inspection run served the optimized build locally and the defect does not affect production code. It is a follow-up before reusing the harness with sensitive neighboring files.

## Unverified criteria and process limits

- I could not personally repeat the real-browser keyboard/320px interaction because the CUA browser host was unavailable. The retained local headless Chrome run, machine-readable measurements, script, and screenshots provide evidence for the criterion. The run used synthetic session, CSRF, and ticket responses; it does not evidence browser-to-real-API authentication or storage.
- The full suite and build were checked from the task-local final logs rather than rerun in this review; T04 made no production-source change. Focused tests and emulator assertion were rerun independently.
- Implementation and review share the uncommitted workspace, as the assignment disclosed. Exact T04 paths and combined ticket/security-relevant paths were inspected; this was not a separate clean-checkout diff review.
- The local Firebase CLI reported unavailable MOTD/remote-config access and default-open emulator rules because no rules file was supplied. The isolated demo-project emulator stayed on loopback, the synthetic assertion passed, and the run shut down its emulator.

No checklist, current-state, approval, or implementation files were changed by this review. T04 remains unchecked pending orchestrator reconciliation and the human merge decision.

## Commands and execution log

Exact review commands and results are recorded in [`logs/tasks/student-tickets/review-T04.md`](../../../logs/tasks/student-tickets/review-T04.md), with complete focused and emulator output in `review-T04-focused-run.log` and `review-T04-emulator-run.log`.

## Re-review of T04-W1

The original T04-W1 finding above is preserved. The implementer replaced the string-prefix containment check with `isWithinRoot(rootPath, candidatePath)`, which evaluates `path.relative` and rejects parent escapes, parent-prefixed results, and absolute results. The same helper is exported for the inspection harness checks. I inspected the exact helper and assertions. An independent direct check passed: an in-root file is accepted; a `build-private` sibling and a parent-directory escape are rejected. The check output is retained in [`review-T04-W1-check.log`](../../../logs/tasks/student-tickets/review-T04-W1-check.log).

The implementer's browser rerun log and JSON include those same assertions and report PASS for the 320px viewport and keyboard checks. I did not rerun the browser script because this environment has no browser control host or Chrome CDP listener on port 9225; rerunning it would also overwrite the retained screenshots and result JSON. The rerun still uses synthetic session, CSRF, and ticket responses as previously disclosed.

**Re-review result: T04-W1 resolved. Final T04 verdict: pass. Final combined T01–T04 verdict: pass.** No finding remains open from this review. The browser endpoint stub, shared-workspace review, and logged full-suite/build evidence remain the process limitations recorded above. This re-review does not change the checklist or approval state.
