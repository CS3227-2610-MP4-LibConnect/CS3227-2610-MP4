# Bug FAQ T04 correction review — revision 1

Date: 2026-11-13
Specification/checklist/handoff: approved Bug FAQ v0.4
Dispatch: human-approved Batch 2 correction revision 1
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1`, fresh clean archive of HEAD `c991ddf3f7d3105e4deb19fdc1c11affb5612a48` with exact available Batch 1 and Batch 2 overlays
Verdict: **Pass with follow-up**

## Dispatch and scope verification

Verified before testing that `assignment-batch-2.json` has `correctionDispatch.revision: 1`, records human approval on 2026-11-13, and scopes the correction to `StudentBugFaq.css`, `StudentBugFaq.tsx`, `StudentBugFaq.test.tsx`, and `docs/UserGuide.md`. The new T03/T04 reports and logs and prior reviews exist in the snapshot. The plan validator passed. No files were edited by the reviewer.

## Criteria and behavior

- **User Guide accuracy:** Pass. The guide now accurately describes opening a title/tag result card, using **Search more**, and using **Load more replies**. These match the UI labels/actions in `StudentBugFaq.tsx`.
- **T03 + T04 combined behavior:** Pass with a mobile-layout follow-up. The approved section placement, Title/Tags search, title/tag-only cards, read-only details, fix note/conversation and pagination are preserved. The previous UTF-16 truncation is removed; local submission accepts up to 100 Unicode code points and rejects 101 without calling the API. The User Guide now names current actions.
- **320px/desktop geometry:** Independent synthetic CSS geometry showed no overlap and no viewport overflow at either 320px or 1440px. At 320px, the Search field label remains in a right-side implicit column at x≈231 while its associated select starts at x=8; this is recorded as low follow-up in the T03 report. Desktop labels and controls align in the expected rows.
- **Synthetic status and pagination evidence:** The existing store/API contract tests still cover resolved-only status checks, projections, pagination, session-bound references, and reply membership. They remain fake-store/mocked-API tests rather than live Firestore verification, as documented by the implementer.
- **Full verification/build:** Pass; exact commands and results below.

### T04 findings

No new blocking T04 findings. The former guide action mismatch is corrected. The human visual criterion remains unverified as required by the approved task contract.

## Unverified criteria and follow-up

The human reported the earlier overlap failure but has not repeated the rendered check after this correction. The full `/student/dashboard` sequence at 320 CSS px remains open: Title and Tags searches, open/back, continuation controls, keyboard focus, readability, and horizontal overflow. The CSS diagnostic used synthetic markup and does not substitute for that evidence. Production Firestore/emulator behavior and index readiness remain unverified; six emulator-gated suites/ten tests were skipped. Do not mark T04 complete until the human visual result and orchestrator reconciliation are recorded.

No guide, implementation, test, spec, checklist, handoff, or manifest edits were made by the reviewer. Checklist remains unchanged; this review does not approve merge or another batch.
