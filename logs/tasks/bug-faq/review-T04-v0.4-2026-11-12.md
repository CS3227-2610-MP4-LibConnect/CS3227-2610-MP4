# Bug FAQ T04 review log

Review cycle: began 2026-11-12; snapshot and verification completed 2026-11-13 (Asia/Singapore)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1`
Snapshot base HEAD: `c991ddf3f7d3105e4deb19fdc1c11affb5612a48`

## Pre-review checks

- Used the distinct refreshed `git archive HEAD` snapshot with 49 explicit Batch 1/Batch 2 implementation/evidence overlays; dependencies are junctioned only.
- Verified human dispatch approval, T03/T04 report paths and contents, UI component/test and both guides before tests. `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` passed.
- Read approved v0.4 spec/checklist/handoff, reviewer profile, current-state, Batch 2 manifest, both implementation reports/logs, and linked Batch 1 review evidence.
- Two absent stale allowed-file entries in the Batch 1 manifest were skipped from overlay; neither is needed by T03/T04. See the T03 review log.

## Commands and exact results

Working directory for Node commands: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1\src\codeclinic`

- `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx; exit $LASTEXITCODE` — **PASS**, 1 suite / 5 tests.
- `$env:CI='true'; npm test -- --runInBand --watchAll=false; exit $LASTEXITCODE` — **PASS**, 86 passed suites / 1,660 passed tests; 6 skipped suites / 10 skipped tests; 92 suites / 1,670 tests total; 141.31 seconds.
- `npm run build; exit $LASTEXITCODE` — **PASS**, optimized production build compiled; 93.62 kB gzip JS / 7.42 kB gzip CSS.
- Playwright diagnostic of actual FAQ stylesheet with synthetic form markup — **PASS as diagnostic**, shows label-cell overlap at 320px. It is not a human route/browser check.

The full suite emitted existing React `act(...)` warnings, a duplicate-key warning in TA queue coverage, and the Node punycode deprecation warning. Build emitted the Node `fs.F_OK` deprecation warning. No tests failed. Six suites/ten tests were skipped by emulator gating. No live/emulator access was attempted.

No `git diff --check` was run from the archive because it contains no `.git` metadata; implementation evidence records that check. No production, test, guide, specification, checklist, handoff, or manifest files were altered by the reviewer.
