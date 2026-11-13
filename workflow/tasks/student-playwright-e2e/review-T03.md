# Independent review: Batch 2 T03 and combined change

Date: 2026-11-13. Reviewed canonical specification v0.1, checklist v0.1, handoff v0.1, and the human-approved Batch 2 proposal/assignment. I did not implement T03. **T03 verdict: pass with follow-up. Combined T01–T03 verdict: pass with follow-up.** This is a review finding, not approval to commit or merge.

## Scope and separation

I inspected the complete task diff: `src/codeclinic/.gitignore`, `README.md`, `package.json`, `package-lock.json`, `playwright.config.ts`, `test/e2e/playwright-server.cjs`, and `test/e2e/student-workflows.spec.ts`; I also checked the relevant ticket route/store authorization path and Batch 1 reports. T03 changed only the browser spec and its own evidence. The unrelated user edits in `docs/DeveloperGuide.md` and `docs/UserGuide.md` were left untouched. No CI, production code, or deployment configuration changed.

The task files are uncommitted and `.git` is read-only, so an exact separate checkout was impractical. The compensating controls were an independently inspected full tracked diff and full new-file contents, allowlist comparison, a separate two-case Chromium run, a fail-closed check, and a server authorization read. I added no review-only tests.

## Criteria and evidence

| Item | Trace and independent result | Verdict / limit |
| --- | --- | --- |
| T03, R3, scenario 2 | A second browser context registers a distinct synthetic Student through the UI. My Tickets shows no owner ticket; direct navigation to the owner's captured detail path shows a load error and none of the title, expected, actual, attempted-fix, or reply text. The owner context reloads and still sees the ticket and all those fields. The test passed independently in Chromium. | **Pass.** Browser-visible denial is verified; detailed API authorization remains covered by existing contract tests. |
| T03, R4 | `firebase emulators:exec` ran the full suite against `demo-codeclinic`: 2 passed, command exit 0, unattended. Implementer evidence also records 8 focused Jest suites / 219 tests passed and build passed. The independent E2E command built successfully. | **Pass with follow-up.** Fresh `npm ci` in a clean checkout remains unverified. |
| Combined T01, R1 / scenarios 3–4 | The only app URL is loopback port 3100; config and setup require local mode, `demo-codeclinic`, and loopback emulator. Setup probes the emulator and starts/stops its own Express child. Missing variables caused Playwright config to exit 1 before test discovery. Both ports were closed after the independent run. Git ignores results/report; README has prerequisites and command. | **Pass with follow-up** for the fresh-install limit. |
| Combined T02, R2 / scenario 1 | The first Chromium case passed independently: registration, Student login/dashboard, create, Open list/detail, reply, close, Closed list/read-only detail, logout/protected-route denial. Runtime-generated passwords, synthetic unique content, UI actions, and state-based waits are present. | **Pass.** |

## Security review and findings

The suite does not set client-controlled role or owner fields to gain access. Ticket route code derives `studentId` from the authenticated session; list queries filter by that ID, detail uses `getOwned`, and unauthorized detail returns 404. Existing server state checks and CSRF handling were not changed. The test uses separate browser contexts, does not log credentials or session identifiers, and turns Playwright trace, screenshot, and video off by default. See `security-review.md` for the boundary assessment.

- **Low, follow-up — clean installation unverified.** `src/codeclinic/package-lock.json` adds Playwright but also removes optional Firebase peer entries and a nested optional Tailwind YAML entry, as recorded by the Batch 1 reviewer. The working-tree build and two browser cases pass, but no fresh `npm ci` has verified the normalized lockfile. Confirm a fresh install before the human merge decision if a disposable clean dependency tree is available. This is an evidence limit, not an observed failure.

No T03 criterion failed, and I found no unapproved T03 scope change or credential artifact. The local run does not establish production behavior or visual layout. No browser image verification was required by this specification. Exact commands and results are in [the review log](../../../logs/tasks/student-playwright-e2e/review-batch-2.md), with the [full E2E console output](../../../logs/tasks/student-playwright-e2e/review-batch-2-e2e-output.log).

Recommended next action: the orchestrator reconciles the T03 and combined evidence, records the follow-up limits, and presents the human with the merge decision. No checklist status or approval state was changed by this reviewer.
