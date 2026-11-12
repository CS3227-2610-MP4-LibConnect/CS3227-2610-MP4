# T04 Scoped Correction Report — Bug FAQ v0.4

Status: Guide wording corrected and verified; independent re-review pending.
Specification/checklist/handoff: approved Bug FAQ v0.4. This correction followed the explicit human-approved Batch 2 correction dispatch revision 1 recorded in `assignment-batch-2.json` (2026-11-13).

## Finding addressed

Updated `docs/UserGuide.md` to match the actual interface: students open a result by selecting its title/tag card, continue sparse result scans with **Search more**, and continue the conversation with **Load more replies**. The guide continues to describe the read-only detail projection, resolved-only eligibility, speaker labels, and literal message text.

## Changed file

- `docs/UserGuide.md`

## Verification

- Final focused UI suite from `src/codeclinic`, repeated after the last CSS adjustment: `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx` — PASS, 1 suite / 6 tests.
- Full suite from `src/codeclinic`: `$env:CI='true'; npm test -- --runInBand --watchAll=false` — PASS, 86 suites and 1,661 tests passed; 6 suites and 10 tests skipped (emulator-gated), 92 suites / 1,671 tests total. No failures. Output included Node `punycode` deprecation, pre-existing React `act(...)` warnings in dashboard/notification/My Tickets tests, and a duplicate-key warning in TA queue coverage.
- Production build from `src/codeclinic`: `npm run build` — PASS; optimized build compiled. Bundle output: 93.65 kB gzipped JS and 7.46 kB gzipped CSS. Node emitted `fs.F_OK` deprecation warning.
- Repository root: `git diff --check` — PASS, exit 0 and no whitespace errors. Git printed line-ending conversion notices for existing changed files.

T03-specific UI and geometry verification are recorded in `implementation-T03-v0.4-correction.md` and its log.

## Open visual verification and limitations

The previously reported human failure at 320 CSS px must be rechecked after the layout correction at `/student/dashboard`. The Playwright geometry diagnostic uses synthetic markup and does not replace rendered human route verification. Ask the human to repeat Title and Tags searches, open/back, available search/reply continuation, keyboard focus, readability, and horizontal overflow; leave the criterion open until the human reports results. No live Firestore, emulator, index deployment, commit, push, or merge occurred.
