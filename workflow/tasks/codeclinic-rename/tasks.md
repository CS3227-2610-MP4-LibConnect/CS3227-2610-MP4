# Implementation checklist: CodeClinic rename

Version: 0.1 (2026-11-08)
Task ID: `codeclinic-rename`
Specifications: see `workflow/tasks/codeclinic-rename/spec.md`
Checklist approval evidence: the human replied "approvrf" (approved) to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

Tasks are grouped as approved by the human on 2026-11-08 (replied "approved"). Tasks in the same group may run in parallel; groups run in order. Checkboxes are implementation tracking only. The orchestrator marks a task `[x]` only after independent review.

This task renames and removes code; it must not change any security, validation, session, rate-limit, or routing rule. Existing tests may be edited only to rename values, labels, paths, and file names, or to delete tests of the removed Book catalog. A test's security assertion must never be weakened or removed. All paths are under `src/codeclinic/`.

Shared test files, as approved with the grouping: `LoginPage.integration.test.tsx` and `firestore-mode.integration.test.js` belong to T01 for role values; `server.test.js` is edited by T03, T04, and T05, each in its own group; T03 leaves `MemberCatalogSearch.test.tsx` for T04 to delete; T06 may move test imports to `email.js`; "README.md" in T05 means `src/codeclinic/README.md`.

## Group 1 — Server roles and login pages (parallel)

- [ ] **T01 — Server account types and identifiers.** In `server/auth/register.js`, `server/auth/firestore-registration.js`, and `server/auth/login.js`, replace `MEMBER`/`LIBRARIAN` with `STUDENT`/`TA` and `memberId` with `studentId`. Stored records with the former values must fail closed as malformed (account-registration v0.7 amendment). Update the affected server tests by renaming values only. (account-registration R2, R4–R6; role-aware-login R3–R4.)

- [ ] **T02 — Registration and login pages.** In `src/RegistrationPage.tsx` and `src/LoginPage.tsx`, change the choices, labels, request values, and messages to Student and TA. The TA notice says a TA Coordinator must activate the account. Update the matching page tests by renaming values and labels only. (account-registration R2, R3, R7; role-aware-login R1–R2.)

## Group 2 — Dashboards and email helpers (parallel)

- [ ] **T03 — Role dashboards and routes.**
  - Rename `src/MemberDashboard.tsx` to `src/StudentDashboard.tsx` and `src/LibrarianDashboard.tsx` to `src/TADashboard.tsx`.
  - Update the routes in `src/index.tsx` and `src/DashboardRouteGuard.tsx`, the brand link in `src/DashboardLogout.tsx`, and the frontend-shell paths in `server/index.js` to `/student/dashboard` and `/ta/dashboard`.
  - The former paths are not served or redirected.
  - Update the dashboard and route tests by renaming only.

  (role-based-dashboards v0.5 R1–R7.)

- [ ] **T06 — Move the email helpers into their own module.** Move `canonicalizeEmail` and `emailKeyFor` from `server/auth/login.js` to a new `server/auth/email.js`, and import them in `login.js`, `register.js`, and `firestore-registration.js`. Behavior is unchanged, and the existing email tests pass. (PLAN.md *Refactor during the role-rename tasks*; role-aware-login R4.)

## Group 3 — Remove the Book catalog

- [ ] **T04 — Remove the retired Book catalog.**
  - Delete `server/catalog/`, the catalog mount and `catalogDb` option in `server/auth/login.js` and `server/index.js`, `src/MemberCatalog.tsx`, `src/MemberCatalog.css`, `scripts/seed-local-books.js`, and their tests (`test/member-catalog.*`, `test/MemberCatalog*`, `test/seed-local-books.test.js`).
  - The student dashboard becomes a basic landing view with the name greeting, consistent with the TA dashboard and the shared theme.
  - `GET /api/member/catalog` no longer exists.

  (member-catalog-search retirement; role-based-dashboards R2, R7.)

## Group 4 — Internal and user-visible names

- [ ] **T05 — Internal and user-visible names.**
  - **Configuration variables:** rename `LIBCONNECT_FIRESTORE_MODE` and `LIBCONNECT_FIRESTORE_PROJECT_ID` to `CODECLINIC_*` in `server/firestore-target.js`, `apphosting.yaml`, `README.md`, and tests. The server must not read the former names.
  - **Emulator project ID:** change the local ID to `demo-codeclinic` in `server/firestore-target.js`, `.firebaserc`, `README.md`, and tests.
  - **Session cookie:** rename it to `__Host-codeclinic_session`.
  - **Storage key:** rename the registration notice key to `codeclinic.registrationNotice`.
  - **Package name:** set it to `codeclinic` in `package.json` and `package-lock.json`.
  - **UI text:** replace "LibConnect"/"LIBCONNECT" with "CodeClinic" in page titles, the login and registration headings, `public/index.html`, and server log messages.
  - **Search check:** afterwards, a case-insensitive search for `libconnect` under `src/codeclinic/` (excluding `node_modules` and `build`) finds nothing.

  (Overview amendments; account-registration v0.7 R8; environments-and-deployment v0.2 R1.)

## Group 5 — Guides

- [ ] **T07 — Update the guides to match.** Update `docs/UserGuide.md` (Student and TA, the new routes, CodeClinic name, no Book catalog, and remove the release-status note once it no longer applies) and the affected sections of `docs/DeveloperGuide.md` (layout, local setup variables and emulator project ID, registration, login and dashboard routes, the catalog section removed, the shared-components table, and the known-issue note). Each UI label in the User Guide must match the code. (Brief: guides must match the product.)

## Group 6 — Verification and evidence

- [ ] **T08 — Verify and record evidence.**
  - Run `npm ci`, `CI=true npm test -- --watch=false`, and `npm run build`.
  - Run the opt-in Firestore emulator integration test with `demo-codeclinic`.
  - Run the T05 search check.
  - Record changed files, commands, results, deviations, and risks in `implementation-report.md` and `logs/tasks/codeclinic-rename/`, including the *Subagent token usage* table.

## Approval boundary

Checklist v0.1 and handoff v0.1 are human-approved (2026-11-08). The six-group layout and Group 1 implementation dispatch were human-approved on 2026-11-08. Review, later dispatch, commit, and merge remain separate human decisions.

## Amendments

- 2026-11-08: Drafted at the human's direction after the human confirmed the task ID and its scope, including removal of the retired Book catalog.
- 2026-11-08: The human approved checklist v0.1 and handoff v0.1.
- 2026-11-08: The human approved the six-group layout proposed by the task grouper and the Group 1 dispatch. Whole tasks were moved under group headings without changing their wording or checkboxes.
