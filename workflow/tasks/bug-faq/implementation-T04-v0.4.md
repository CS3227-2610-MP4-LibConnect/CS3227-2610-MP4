# T04 Integration and Documentation Report — Bug FAQ v0.4

Status: Synthetic integration/contract verification and production build passed. Human visual verification remains open; independent review is pending.
Specification: `workflow/specs/bug-faq.md` v0.4.

## Changes

- `docs/UserGuide.md`: documents the dashboard FAQ placement, Title/Tags searches, resolved-only eligibility, title/tag-only result cards, fix note and conversation details, speaker labels, literal message content, read-only behavior, and paging/retry feedback. Removed Bug FAQ from planned features and added it to current build features.
- `docs/DeveloperGuide.md`: documents the API and store behavior, active Student and `RESOLVED` rechecks, data projections, pagination limits, encrypted session/query/reference-bound token behavior, configured Firestore indexes, and synthetic contract test coverage.
- T03 component, dashboard, CSS, and UI tests are listed in the T03 report; no additional production code was changed for T04.

## Synthetic verification

Controlled synthetic store and HTTP contract tests cover the four statuses (`OPEN`, `CLAIMED`, `CLOSED`, `RESOLVED`), tickets belonging to different owners, bounded dense and sparse search continuation, title/tag projection, tag searches, malformed and typed cursor boundaries, resolved-only detail rechecks, reply membership/projection and continuation, and active Student/session binding. These tests use fake Firestore interfaces and mocked HTTP storage; they do not connect to Firestore Emulator or a live project.

## Checks

From `src/codeclinic`:

- `$env:CI='true'; npm test -- --runInBand --watchAll=false` — PASS: 86 suites passed, 1,660 tests passed; 6 suites and 10 tests skipped (emulator-gated). The run emitted existing React `act(...)` warnings from dashboard/notification/My Tickets tests and a duplicate-key warning from a TA queue coverage test; no test failed. Node also emitted the existing `punycode` deprecation warning.
- `npm run build` — PASS: optimized production build compiled successfully. Node emitted an `fs.F_OK` deprecation warning. Bundle output: 93.62 kB gzipped JS and 7.42 kB gzipped CSS.

From the repository root:

- `git diff --check` — PASS (exit 0). Git printed line-ending conversion notices for existing changed files; no whitespace errors were reported.

## Limitations and remaining risk

- No Firestore Emulator or live Firestore was accessed. The emulator-gated suites remained skipped; synthetic contract tests provide the T04 status/projection/pagination evidence.
- No browser visual check was performed. Human verification is required at `/student/dashboard` with a 320 CSS px viewport; see handoff steps below. Do not treat visual/accessibility layout as verified until the human reports the result.
- The configured FAQ composite index has not been deployed or checked against any project.
- Combined tests include pre-existing React warnings noted above; these did not fail the suite.

## Human visual verification requested

At `/student/dashboard`, set the viewport width to 320 CSS px. Search once by Title and once by Tags, open a result and return to results, continue results and replies when continuation controls are present, then tab through the controls. Report whether content overflows horizontally, text and controls remain readable, and keyboard focus is visibly indicated. Please include a screenshot of the FAQ area if any issue appears. This check remains open pending human evidence.
