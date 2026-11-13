# Implementation checklist: student-playwright-e2e

Version: 0.1 (2026-11-13)
Specification: `workflow/specs/student-playwright-e2e.md` v0.1 (human approved in conversation on 2026-11-13)
Approval evidence: the human replied "approve" to the question approving checklist v0.1 and handoff v0.1 in conversation on 2026-11-13. Batch dispatch and dependency/browser installation remain separate decisions.

- [x] **T01 — Local Playwright runner and fail-closed configuration.** Add the Playwright development dependency and lockfile update, a `test:e2e` npm script, Playwright configuration, and Git ignores for results. Run Chromium headlessly against the built app and Express with the pinned `demo-codeclinic` Firestore emulator target. Document required local tools and the command. Ensure missing or inconsistent emulator configuration stops before browser actions and that the command has no production URL fallback. Verify the runner lists tests and the missing-emulator path fails safely. No CI or production configuration change. (R1, R4; scenarios 3–4.)

- [x] **T02 — Core Student browser journey.** Write a browser test that generates synthetic runtime credentials, registers and signs in a Student, creates a ticket, finds and opens it through My Tickets, posts a reply, closes the ticket, verifies the Closed view and disabled reply flow, and signs out. Use role/label-based locators and meaningful state waits. Verify this item against a disposable local emulator and record its separate result. Depends on T01. (R2, R4; scenario 1.)

- [x] **T03 — Ownership boundary and final verification.** Extend the browser suite with a second isolated Student context. Verify list and direct-URL denial without exposing the first Student's title, description, or reply, while the owner retains access. Update the local run documentation as needed, run the E2E suite, relevant existing Jest tests, and build, and record exact commands, results, changed files, deviations, and unresolved risks. Ensure traces, screenshots, and video remain off by default. Depends on T02. (R3–R4; scenarios 2–4.)

## Approval and review boundaries

The human approved the specification, checklist, handoff, both batch dispatches, the Playwright dependency and Chromium installation, and the Batch 1 helper correction. Implementation and independent review are complete; commit and merge remain human approval gates. One implementer completed the approved items in order, and different reviewers checked each batch and the combined change. Preserve the user's current edits to `docs/UserGuide.md` and `docs/DeveloperGuide.md`.
