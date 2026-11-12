# Bug FAQ Batch 2 correction proposal

Date: 2026-11-13. Approval state: proposed; no correction dispatch is approved by this document.

## Findings to correct

- T03: At 320 CSS pixels, both search labels occupy the same grid cell. The narrow CSS rule moves both to column 1 but retains `grid-row: 1`.
- T03: HTML `maxLength={100}` counts UTF-16 units, while the approved API permits up to 100 Unicode code points. Some valid queries are truncated in the browser.
- T04: The User Guide says **View answer** and **Load more results**; the UI opens a title/tag result card and labels continuation **Search more**.

Independent evidence: `review-T03-v0.4.md`, `review-T04-v0.4.md`, and their task logs. The focused UI suite, full suite, and production build passed, but the reviewers recorded changes-required verdicts for these findings. The human also reported that the “search bug faq” and “search field” text overlaps at 320 CSS pixels; see `human-visual-verification.md`. The other browser criteria remain unverified.

## Proposed scoped dispatch

One implementer corrects T03 before T04; a different reviewer checks each and their combined behavior.

1. In `src/codeclinic/src/tickets/StudentBugFaq.css`, allow the mobile form labels to occupy separate rows. Recheck form geometry at 320 and desktop widths.
2. In `src/codeclinic/src/tickets/StudentBugFaq.tsx`, accept up to 100 Unicode code points without UTF-16 truncation and show a useful local validation message for overlong input. Add meaningful boundary tests in `src/codeclinic/test/StudentBugFaq.test.tsx`.
3. In `docs/UserGuide.md`, describe opening the title/tag result card and using **Search more**. Keep **Load more replies** for the conversation.

Code and documentation scope is limited to those four files. New implementation report/log files for the correction are permitted under `workflow/tasks/bug-faq/` and `logs/tasks/bug-faq/`. The specification, checklist, handoff, server/token code, dependencies, deployment configuration, and index configuration are unchanged.

Verification: focused UI tests, full test suite, production build, `git diff --check`, and an independent 320/desktop CSS geometry diagnostic. Repeat the human route/browser check at 320 CSS pixels after correction and record the result. No live Firestore, deployment, commit, push, or merge is included.
