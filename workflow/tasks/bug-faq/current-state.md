# Bug FAQ current state

Updated: 2026-11-13

- Canonical specification, checklist, handoff, and batch plan: v0.4 approved. Human approved Batch 1 and Batch 2 dispatches.
- Batch 1 T01/T02 passed independent review after scoped corrections and are checked. Evidence history is in `assignment-batch-1.json`.
- Batch 2 initial review required changes for label overlap, Unicode query length, and User Guide wording. The human reported overlapping labels at 320 CSS px; see `human-visual-verification.md`.
- The human approved Batch 2 correction revision 1. T03/T04 corrections passed independent re-review with follow-up: focused UI 1/6 passed, full suite 86/1,661 passed (6 emulator-gated suites/10 tests skipped), production build passed. The reviewer noted a low mobile label alignment risk.
- On rendered `/student/dashboard` recheck, the human supplied a screenshot and confirmed the Search field label remains misaligned from its selector. The screenshot is preserved under `logs/tasks/bug-faq/visual/`. T03 was reopened; T04 remains unchecked. Other browser interactions/focus/overflow remain unverified.
- The human approved CSS-only T03 correction revision 2 in `batch-2-correction2-proposal.md` on 2026-11-13. Implementation and independent review are complete; separate T03/T04 verdicts are pass-with-follow-up (`review-T03-v0.4-correction2.md`, `review-T04-v0.4-correction2.md`). Focused 6/6, full 86 suites/1,661 tests, build, and 320/1440 synthetic geometry/focus checks passed; 6 emulator-gated suites/10 tests were skipped. The Batch 2 complete manifest validator passed. The human reported the requested rendered `/student/dashboard` 320 CSS px check works after revision 2; see `human-visual-verification.md`. T03/T04 are checked, completing the checklist. Live Firestore/emulator and production index readiness remain unverified. The human approved the merge decision, then the scoped commit and exact message, in conversation on 2026-11-13. Commit preparation is next; no commit, push, deployment, or merge has occurred at this checkpoint.
- Final summaries: `implementation-report.md`, `review-report.md`, `security-review.md`.
- Proposed scoped commit and message: `merge-handoff.md`.

This is a navigation index only; verify approvals and evidence against the primary artifacts. It does not grant approval or permission.
