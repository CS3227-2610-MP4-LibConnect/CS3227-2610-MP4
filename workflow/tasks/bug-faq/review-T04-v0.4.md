# Bug FAQ T04 review

Review cycle: 2026-11-12 to 2026-11-13
Specification/checklist/handoff: approved Bug FAQ v0.4
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1`, clean archive of HEAD `c991ddf3f7d3105e4deb19fdc1c11affb5612a48` with exact available current Batch 1 and Batch 2 implementation/evidence overlays
Verdict: **Changes required**

## Dispatch, scope, and evidence

Batch 2 manifest records human dispatch approval for T03/T04 and references the T04 report and log, both present in the refreshed snapshot. It lists T04 changes in the two guides plus T03 UI/verification artifacts; the reviewed combined change stays within that scope. Plan validation passed. T04 makes no additional production source changes.

## Criteria and findings

- **Synthetic status/projection/paging evidence:** Partial pass. Store contract tests use controlled Firestore fakes to verify resolved-only query bounds, statuses, multi-owner projections, dense/sparse continuations, reply membership, and reply paging; API contract tests exercise authorization, projection, token binding, and boundary validation with a mocked store. This is useful deterministic contract evidence and the implementation report accurately discloses that it is not Firestore Emulator/live testing. It is distributed across store/API test layers rather than a single route-to-Firestore end-to-end test; this remains an integration limitation, not evidence of a production Firestore defect.
- **Guide accuracy:** Fail (finding T04-1 below). The User Guide describes actions that do not exist in the UI.
- **Full verification/build:** Pass. Independent full suite and production build passed; exact output is in the linked log.
- **Human visual check:** Open as required. No human result exists for the `/student/dashboard` 320 CSS px interaction and keyboard-focus check. A separate synthetic CSS geometry diagnostic found overlapping search labels at 320px (documented as T03-1); it does not replace the human test.
- **T03/T04 combined behavior:** The section is in the specified dashboard position, uses the reviewed API, preserves literal detail content and read-only behavior, and offers continuation/retry states. However, the mobile label overlap and inaccurate user-guide action names prevent declaring the combined delivery ready.

### T04-1 — Low: User Guide tells students to select controls that are not present

Location: `docs/UserGuide.md`, Bug FAQ section (around lines 265–272).

Evidence: The guide says to select **View answer** and **Load more results**. The implemented result control is a button whose content is title and tags (there is no “View answer” action text), and result continuation is labelled **Search more**. The reply continuation label **Load more replies** is correct. This mismatch was confirmed against `StudentBugFaq.tsx` in the review snapshot.

Requirement/risk: T04 requires the User and Developer Guides to accurately describe the implemented search cards, detail view, and pagination. A student following the guide cannot find the named controls.

Recommended action: update the User Guide to describe opening a title/tag result card and use the actual **Search more** label, or revise the UI labels consistently if that is the intended guide language.

## Unverified criteria and risks

- The human-required browser/keyboard check at `/student/dashboard`, 320 CSS px remains pending: Title and Tags searches, open/back, continuations, focus, readability, and horizontal overflow.
- No Firestore Emulator or live Firestore was accessed; emulator-gated suites remain skipped. Production composite-index readiness is unverified.
- Synthetic evidence spans fake-store and mocked-API contracts but does not exercise the complete route-to-real-Firestore path.
- Existing warnings and skips are recorded in the execution log. The checklist remains unchanged and T04 must remain unchecked until the documentation issue is corrected and the human visual check is recorded.

No implementation, test, guide, spec, checklist, handoff, or manifest edits were made as part of this review. This verdict does not approve merge or another batch.
