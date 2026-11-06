# Independent review: role-aware login T02

## Verdict

**Pass with follow-up.** T02 client behavior matches the approved v0.2 specification and checklist. No functional defect was found. One low-severity test coverage follow-up is recorded below; it does not block this client task.

## Scope and review setup

- Reviewed specification: `workflow/specs/role-aware-login.md` v0.2 (2026-11-05).
- Reviewed task: `workflow/tasks/role-aware-login/tasks.md` v0.2, Group 2 T02 (R2, R5, R7 client behavior only).
- Read `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/reviewer.toml`, `spec.md`, `handoff.md`, `technical-design-proposal.md`, `implementation-T02.md`, and shared `implementation-report.md`.
- Compared `src/libconnect-mp4/src/App.tsx` and `src/libconnect-mp4/test/App.test.tsx` to the working-tree base diff. The test file is new in this working tree, so it has no tracked base diff; its content was inspected directly.
- The repository was not clean and `.git` is read-only in this environment, so a separate checkout/worktree was unavailable. Compensating controls: reviewed the T02 handoff and report, inspected the whole T02 client implementation and tests directly, checked current Git status and diff scope, and ran local verification. Later server T04 changes were treated as integration context and not attributed to T02.
- No production files or tests were changed by this review. No live Firebase or external service was contacted.

## Acceptance trace

| T02 acceptance | Evidence | Result |
| --- | --- | --- |
| Blank fields produce field-specific errors without a request | `App.tsx` lines 18–25 validates both fields before fetch; `App.test.tsx` parameterizes both blank and either whitespace-only field and checks fetch was not called | Pass |
| Email/password are sent with selected type in one login request; password is exact | `App.tsx` lines 29–33 sends `email`, `password`, and `accountType`; tests exercise both selected values and a password with leading/trailing spaces, and assert one call to `/api/auth/login` | Pass |
| Type can be switched | Native labelled radio controls update state at `App.tsx` lines 95–116; test clicks Librarian from the default Member state, then confirms the submitted type; separate request case covers Member | Pass |
| Uniform denial does not show success | HTTP 401 maps to the fixed generic denial at lines 35–37; test asserts the message and absence of signed-in text | Pass |
| Temporary server failure and network failure do not show success | HTTP 503 maps to a retry message at lines 39–41; fetch rejection is caught at lines 62–64; test covers 503 | Pass; fetch-rejection branch is not directly tested |
| HTTP 200 confirmation uses only server-returned account type | The response must parse and contain `MEMBER` or `LIBRARIAN` at lines 48–61; test selects Librarian while the server returns Member, then asserts the Member confirmation only | Pass |
| Other non-200, invalid JSON, and invalid/missing returned type do not show success | Generic non-200 handling at lines 43–46 and fail-closed response parsing/validation at lines 48–59 | Pass by inspection; malformed 200 response branches lack direct tests (Finding F1) |
| Validation and server errors are accessible | Each field error is associated through `aria-describedby`, has `role="alert"`, and sets `aria-invalid`; the form error region has `role="alert"` and `aria-live="polite"` at lines 128–150; validation tests locate alerts by role | Pass by inspection; server-error role is not directly asserted (Finding F1) |

## Findings

### F1 — Low: cover malformed success responses and assert server-error accessibility

- **Location:** `src/libconnect-mp4/test/App.test.tsx`; corresponding implementation branches are in `src/libconnect-mp4/src/App.tsx` lines 43–59 and 150.
- **Evidence:** The implementation correctly displays a generic error if HTTP 200 has invalid JSON or lacks/contains an unsupported `accountType`, and it marks the form error region as an alert. Existing tests cover valid server-returned type, HTTP 401, and HTTP 503, but do not exercise malformed HTTP 200 bodies or query server errors by alert role.
- **Requirement/risk:** T02 explicitly requires server-returned role handling and accessible error messages. Direct tests would protect the fail-closed handling and accessibility semantics against later regression.
- **Recommended action:** Add focused component assertions for invalid JSON and missing/unsupported `accountType` on HTTP 200, and verify denial/retry messages are exposed through the alert region. No production fix is required based on current evidence.

## Scope and security observations

- The selector is sent as request context; the UI does not use it to determine the authenticated type. The confirmation comes from the validated server response.
- Password blankness is checked with `trim()`, while the original password string is serialized unchanged. No credential value is logged or persisted by this component.
- HTTP 429 and other unexpected statuses use generic non-success feedback. The later server implementation returns the minimal `{ accountType }` response on success, matching the client contract.
- The shared working tree contains other changes outside this T02 review, including package/server files, styles, agent configuration, and T03/T04 artifacts. These were not included in the T02 verdict. `git status --short` also listed Firebase debug logs; they were not opened or copied.
- `git diff --check` reported trailing whitespace at `App.tsx:119` (a blank line in the combined T01/T02 file). This is non-functional and outside the T02 behavior findings; it remains unmodified.

## Verification

From `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --runInBand` — PASS, 4 suites and 48 tests.
- `npm run build` — PASS, optimized production build compiled successfully; Node emitted the existing `fs.F_OK` deprecation warning.

The complete suite includes T03/T04/server tests from the later shared tree; `test/App.test.tsx` passed in that run. Verification was local and used no live Firebase project.

## Handoff

T02 is suitable for orchestrator reconciliation with the F1 test-coverage follow-up. The T02 checkbox remains unchanged; this review does not update shared checklist state or grant merge approval.

## Re-review addendum — 2026-11-06

The human-approved, test-only F1 fix was reviewed against the original finding and `implementation-T02-review-fix.md`. The only reported code/test change is `src/libconnect-mp4/test/App.test.tsx`; no production source or checklist changes were made.

- HTTP 200 with invalid JSON, missing `accountType`, or unsupported `accountType` each asserts the generic form error is present in a `role="alert"` region and that signed-in state is absent.
- HTTP 401 denial and HTTP 503 retry tests now assert their messages are present in a `role="alert"` region and that signed-in state is absent.
- Focused verification: `npm test -- --watchAll=false --runInBand --runTestsByPath test/App.test.tsx` from `src/libconnect-mp4/` — PASS, 1 suite and 13 tests. Node emitted a `punycode` deprecation warning.
- No live Firebase or external service was contacted. No new finding was identified.

**F1 is closed. Final T02 verdict: pass.** The initial pass-with-follow-up verdict above is retained as historical review evidence and is superseded by this addendum. The shared checklist remains unchanged; this review does not grant merge approval.
