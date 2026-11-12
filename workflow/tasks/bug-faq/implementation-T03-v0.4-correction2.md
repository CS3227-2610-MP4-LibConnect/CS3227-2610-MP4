# T03 CSS Alignment Correction 2 — Bug FAQ v0.4

Status: CSS correction implemented and verified; independent review pending.
Approved task: Bug FAQ T03, v0.4. Human-approved correction dispatch revision 2 (2026-11-13), recorded in `assignment-batch-2.json`.

## Change

Changed only `src/codeclinic/src/tickets/StudentBugFaq.css`. Inside the mobile media query, added a specificity-matched `.student-bug-faq-search label:nth-of-type(2)` override setting `grid-column: 1`. This places the Search field label directly above its selector on mobile despite the more specific desktop rule. Sequential mobile rows, desktop layout, and focus styles are unchanged.

## Verification

- Focused suite from `src/codeclinic`: `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx` — PASS, 1 suite / 6 tests.
- Full suite from `src/codeclinic`: `$env:CI='true'; npm test -- --runInBand --watchAll=false` — PASS, 86 suites / 1,661 tests passed; 6 suites / 10 tests skipped (emulator-gated), 92 suites / 1,671 tests total; 159.756 seconds. No failures. Existing output included `punycode` deprecation, React `act(...)` warnings in dashboard/notification/My Tickets tests, and a duplicate-key warning in TA queue coverage.
- Build from `src/codeclinic`: `npm run build` — PASS, optimized production build compiled; gzip JS 93.65 kB and CSS 7.47 kB. Node emitted `fs.F_OK` deprecation warning.
- Playwright CSS geometry diagnostic using the actual FAQ stylesheet and synthetic form markup — PASS at 320 and 1440 CSS px. At 320, Search field label and selector both start at x=32; the label is at y=118 and selector at y=148. All form elements fit the 320px viewport without overlap. At 1440, Search field label and selector both start at x=887.45 (label y=32; selector y=62); desktop two-column label/control layout remains intact and all elements fit the viewport.
- `git diff --check` — PASS (exit 0, no whitespace errors). Git printed LF-to-CRLF notices for pre-existing changed tracked files.

## Remaining verification and risks

The synthetic geometry check does not replace the required human rendered-route recheck. The previous human screenshot confirmed the alignment issue before this correction; no post-correction human result exists. Recheck `/student/dashboard` at 320 CSS px, including Title/Tags search, open/back, available continuation controls, keyboard focus, readability, and horizontal overflow. Keep visual verification open until reported. No live Firestore, emulator, index deployment, commit, push, or merge occurred.

The workspace also contains an untracked screenshot at the repository root; it was not opened or modified as part of this CSS-only correction.
