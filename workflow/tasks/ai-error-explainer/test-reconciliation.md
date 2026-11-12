# Test reconciliation for provisional-budget amendment

Date: 2026-11-11
Proposed specification: v0.3 draft; checklist: v0.2 draft.

The two Student pre-implementation test files and `test-coverage.md` were written against the prior v0.2 specification. Targeted inspection found no assertion of a numeric input cap, output-token cap, or rate-limit value, so their existing public UI and route expectations remain applicable. Their recorded run (2 suites, 12 expected failures because the feature is absent) remains historical evidence and was not rerun merely for this planning amendment.

When T01 is freshly approved and completed, add focused fake-gateway tests for `maxInputChars = 98,304` UTF-16 code units and `maxOutputTokens = 1,024`, including exactly-at-cap and over-cap complete-context behavior. T02/T03/T04 tests must assert no provider call and no partial context on overflow; T08 must record the separately authorized provider compatibility smoke outcome. The provisional HTTP success envelope in `test-coverage.md` still needs reconciliation with T01's exact response contract.

No TA test file was inspected, changed, or run for this reconciliation.
