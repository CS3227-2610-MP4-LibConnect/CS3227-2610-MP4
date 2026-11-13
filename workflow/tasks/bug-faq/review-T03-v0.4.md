# Bug FAQ T03 review

Review cycle: 2026-11-12 to 2026-11-13
Specification/checklist/handoff: approved Bug FAQ v0.4
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1`, clean archive of HEAD `c991ddf3f7d3105e4deb19fdc1c11affb5612a48` with the exact available current Batch 1 and Batch 2 implementation/evidence overlays
Verdict: **Changes required**

## Dispatch and scope

The approved Batch 2 assignment manifest lists T03 and T04 and records human dispatch approval on 2026-11-12. Its T03/T04 implementation report paths, T03 UI test, dashboard/component/CSS, guide files, and Batch 1 dependencies were present in the refreshed snapshot before review. `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` passed. Two stale Batch 1 allowed-file entries (`src/codeclinic/server/server.js` and `src/codeclinic/server/tickets/index.js`) were absent both from the workspace and clean archive; neither is needed by the T03/T04 source graph. The snapshot was assembled from `git archive HEAD`, not the live mutable source tree; dependencies alone are junctioned.

The review covered `StudentDashboard.tsx`, `DashboardViews.css`, `StudentBugFaq.tsx`/CSS, UI tests, current Batch 1 route/store/tests, approved spec/checklist/handoff, T03/T04 implementation reports/logs, and both guide sections. No implementation, test, spec, checklist, handoff, or manifest files were changed.

## Acceptance criteria trace

- **Placement and preservation:** Pass by code inspection and UI test. FAQ is mounted directly after Ask for Help; Active Tickets precedes it. The existing Create Ticket link/section and Active Tickets behavior remain. Dashboard diff retains the human's Active Tickets → Ask for Help ordering. FAQ is mounted only in `StudentDashboard`, not the TA dashboard.
- **Search, results, detail, paging:** Pass by code inspection and focused contract tests. Default Title, labelled Title/Tags selector, trim and local empty-query validation, query encoding, title/tag-only cards, read-only detail, fix note, literal conversation text, server-provided Student/TA labels, and both continuation actions are implemented. Query/field edits reset results and cursors. Detail and search requests abort prior work and use generation checks before applying responses.
- **Stale responses and safe rendering:** Pass for covered cases. The UI test proves an older search response cannot replace newer results and literal markup is rendered as text. The component renders no author metadata, raw IDs, edit links, or posting controls.
- **Keyboard/accessibility states:** Partial. Form controls and buttons have labels and visible `:focus-visible` outlines; loading/result/error states use status/alert roles. However, the mobile layout places the two search labels in the same grid cell, reducing label readability at the required viewport (finding T03-1 below). The mandatory human browser/keyboard check remains unverified.
- **Query length parity:** Minor mismatch (finding T03-2). The API accepts up to 100 Unicode code points; HTML `maxLength={100}` limits UTF-16 code units, so astral characters consume two units. A valid query of 51–100 such code points is truncated by the browser input before submission.
- **Desktop form layout:** The Search button's implicit grid row is appropriate at desktop: inspection in a headless browser with the actual stylesheet and synthetic form markup placed input, select, and Search on the controls row. This is only a CSS geometry diagnostic, not the required human route/browser verification.

## Findings

### T03-1 — Medium: search labels overlap at the required 320px viewport

Location: `src/codeclinic/src/tickets/StudentBugFaq.css`, `.student-bug-faq-search label { grid-row: 1 }` and the `@media (max-width: 520px)` rule forcing both labels to `grid-column: 1`.

Evidence: In a headless Chromium diagnostic using the snapshot stylesheet and the same form child order, both labels had the same 320px rectangle (`y=8`, `x=8`, width 304px). At desktop width, the labels and three controls occupied intended separate grid cells. The narrow override pins both labels to row 1, column 1, so the visible label text overlaps. The UI tests do not load or assert layout geometry.

Requirement/risk: v0.4 R1 requires readable controls at 320 CSS px and keyboard/screen-reader usability; T03 requires a usable labelled Title/Tags search. Overlapping labels make the controls visually unclear at the specified width.

Recommended action: change the narrow grid placement so labels flow in separate rows (or otherwise occupy distinct cells), then add a layout assertion or rendered check. Keep the human `/student/dashboard` 320px check open until completed.

### T03-2 — Low: the input cap is shorter than the API's Unicode code-point limit

Location: `src/codeclinic/src/tickets/StudentBugFaq.tsx`, search input `maxLength={100}`; API query validator counts `Array.from(normalizedQuery).length`.

Evidence: The API contract test accepts 100 emoji/code points and rejects 101. HTML `maxlength` counts UTF-16 code units, so this input only permits 50 emoji before truncation. A student cannot submit some queries that satisfy the documented API limit.

Requirement/risk: v0.4 R2 explicitly defines a 1–100 Unicode code-point query bound; the UI should not silently impose a different effective bound.

Recommended action: remove the HTML cap and rely on API validation, or enforce a code-point-aware limit and explain the limit without truncation mismatch.

## Verification

- Focused UI tests: **1 suite / 5 tests passed**.
- Full suite: **86 suites passed, 1,660 tests passed; 6 suites and 10 tests skipped** (emulator-gated), 92 suites / 1,670 tests total.
- Production build: **compiled successfully**, optimized bundle 93.62 kB gzip JS / 7.42 kB gzip CSS.
- Headless CSS diagnostic: at 320px both label rectangles overlap at y=8; at 1440px form controls share the intended control row. It used synthetic markup and is not recorded as the required human visual check.
- Full commands and warnings are in `logs/tasks/bug-faq/review-T03-v0.4-2026-11-12.md`.

## Unverified criteria and risk

Human visual/keyboard verification at `/student/dashboard` and 320 CSS px remains open. No live Firestore/Emulator or production index readiness was verified. The UI tests cover five behavioral scenarios but not actual layout geometry, screen-reader behavior, or a mounted API-to-Firestore end-to-end path. Existing full-suite warnings and emulator skips are recorded in the log.

T03 must remain unchecked until the label overlap is corrected and independently re-reviewed. No approval of merge or further batch is implied.
