# Bug FAQ T04 correction review log — revision 1

Date: 2026-11-13 (Asia/Singapore)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1`
Base HEAD: `c991ddf3f7d3105e4deb19fdc1c11affb5612a48`

## Pre-review checks

- Verified fresh clean-HEAD snapshot and exact available current Batch 1/2 overlays. Dependencies are junctioned only.
- Verified Batch 2 manifest `correctionDispatch.revision: 1`, approval evidence, scope, reports/logs, prior reviews, human visual report, and correction proposal before tests. `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` passed.
- Reviewed current-state, approved v0.4 spec/checklist/handoff, correction proposal, human visual verification, prior T03/T04 reviews, and current correction reports/logs.

## Commands/results

Working directory: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1\src\codeclinic`

- `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx; exit $LASTEXITCODE` — **PASS**, 1 suite / 6 tests.
- `$env:CI='true'; npm test -- --runInBand --watchAll=false; exit $LASTEXITCODE` — **PASS**, 86 passed suites / 1,661 passed tests; 6 skipped suites / 10 skipped tests (emulator-gated); 92 suites / 1,671 tests total; 130.935 seconds.
- `npm run build; exit $LASTEXITCODE` — **PASS**, optimized build compiled; gzip JS 93.65 kB, CSS 7.46 kB.
- Independent Playwright CSS geometry diagnostic — **PASS**, no intersecting boxes or viewport overflow at 320px/1440px; see T03 log for exact command and coordinates. At 320px, the label for the selector is horizontally detached from that selector (x≈231 versus x=8).

Existing React `act(...)`, TA duplicate-key, Node punycode, and Node `fs.F_OK` deprecation warnings appeared; no tests failed. Six suites/ten tests were skipped by emulator gating. No live Firestore/emulator, index deployment, or human route check was attempted/performed. No `git diff --check` was run from the archive because it has no `.git` metadata; the implementer report records their check. New review artifacts were separately scanned for trailing horizontal whitespace.
