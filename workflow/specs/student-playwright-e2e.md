# Student Playwright E2E specification

Version: 0.1 (2026-11-13)
Task ID: `student-playwright-e2e` (confirmed by the human on 2026-11-13)
Approval evidence: the human replied "approved" to v0.1 in conversation on 2026-11-13. Checklist, handoff, implementation dispatch, dependency installation, CI changes, cloud access, and deployment require separate decisions.

## Purpose and scope

Add browser-driven Playwright tests for the core Student journey already implemented in CodeClinic: register, sign in, reach the Student dashboard, create a ticket, find and open it through My Tickets, reply, close it, and sign out. Include a second Student to verify that the first Student's ticket is not exposed through the list or a direct detail URL.

The tests exercise the built React app, Express API, and a local Firestore emulator together. They use synthetic data and do not change product behavior, ticket data models, authorization rules, or state transitions. AI, TA actions, Bug FAQ, account editing, notifications, file uploads, and visual regression are outside this initial suite.

## Sources and decisions

- `Overview.md` defines the Student ticket journey and server-owned authorization boundary.
- Approved behavior comes from `workflow/specs/account-registration.md` v0.8, `role-aware-login.md` v0.4, `student-tickets.md` v0.5 (with v0.4 implemented baseline), `student-ticket-activity.md` v0.3, and `student-my-tickets.md` v0.1.
- `docs/UserGuide.md` describes the visible Student controls and outcomes. Existing Jest, React Testing Library, Supertest, and emulator tests remain in place.
- `src/codeclinic/package.json` currently has no Playwright dependency or E2E script. `.github/workflows/ci.yml` runs the existing tests and build, and this draft does not propose changing CI.

## Security and test-data boundaries

- The suite MUST target only `demo-codeclinic` with `CODECLINIC_FIRESTORE_MODE=local-emulator` and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. It MUST fail before browser actions if the emulator target is absent or inconsistent. It MUST never run against the production URL or project.
- Test identities, tickets, and replies MUST be synthetic and unique per run. Passwords MUST be generated only at runtime, never hard-coded in test files or logged. No credentials, session cookies, private user data, or ticket contents may appear in committed artifacts or routine logs.
- The test MUST use the normal browser UI for user actions and must not bypass session, CSRF, ownership, or state checks. A second browser context MUST have its own cookie jar.
- A failed assertion must not weaken an existing security check or conceal a leak. Traces, screenshots, and video MUST be off by default so browser artifacts do not retain password input or session data.

## Requirements

### R1. Playwright setup and repeatable local command

Add `@playwright/test` as a development dependency, a Playwright configuration, and an npm script that builds and runs the E2E suite against the local emulator. The command MUST be documented with prerequisites for Node, the Firebase CLI/Firestore emulator, and the Playwright Chromium browser. The configuration MUST start or reuse the local Express server on a test port, wait for readiness, use Chromium headlessly, and avoid a production URL fallback. Test results and browser artifacts MUST be ignored by Git.

### R2. Core Student browser journey

A Playwright test MUST register a new Student through the form, sign in through the Student choice, and verify the protected Student dashboard. It MUST create a ticket with the required fields through the Create Ticket page and observe the success state. It MUST navigate through My Tickets, find the created ticket in the Open view, open its detail, send a reply, and observe the reply. It MUST close the ticket and verify that it appears in the Closed view, no longer accepts replies, and remains readable. Finally, it MUST sign out and verify that protected Student content is no longer accessible.

The test MUST assert user-visible outcomes and wait for meaningful UI states rather than fixed sleeps. It MUST not depend on pre-existing emulator data or test execution order.

### R3. Student ownership boundary

In a separate browser context, register and sign in a second Student. Their My Tickets view MUST not show the first Student's ticket. A direct visit to the first Student's ticket URL MUST not reveal its title, description, or reply. The first Student's browser context MUST remain able to read the ticket before signing out. These assertions cover the browser-visible boundary; existing API and emulator tests continue to cover detailed authorization contracts.

### R4. Verification and evidence

Run the new E2E command against a disposable local Firestore emulator and record the exact command, test count, pass/fail result, and any setup limitation. Run the existing relevant Jest tests and build. Do not claim a browser test passed if Chromium or the emulator could not run. Do not perform a production smoke test as part of this task.

## Acceptance scenarios

1. A new Student completes registration, login, ticket creation, list/detail navigation, reply, close, and logout in a real Chromium browser against the local app and emulator.
2. A second Student cannot see the first Student's ticket in My Tickets or by directly opening its URL; the first Student can still see it.
3. Running the E2E command without the required local emulator fails safely without contacting a cloud project.
4. A fresh checkout can run the documented command after installing the stated local prerequisites; existing unit and integration tests remain runnable.

## Approval boundaries and risks

- Human approval of this specification is required before writing the checklist and handoff. Those artifacts and the implementation batch require separate approvals under `workflow/README.md`.
- Adding `@playwright/test`, installing Chromium, and changing package scripts require explicit approval at the implementation gate. CI configuration is outside this version; adding an E2E CI job would require a separate approved change.
- A local emulator/browser pass cannot establish production deployment status. Browser screenshots or visual layout claims are outside this test scope.
