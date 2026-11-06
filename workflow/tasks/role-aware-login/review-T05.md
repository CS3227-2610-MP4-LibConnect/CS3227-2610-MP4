# Independent review: role-aware login T05

- **Reviewer scope:** Group 4, T05 only: React-to-Express outcomes and security evidence (R1–R7).
- **Specification reviewed:** `workflow/specs/role-aware-login.md` version 0.2 (2026-11-05).
- **Task artifacts reviewed:** `workflow/tasks/role-aware-login/spec.md`, `tasks.md` version 0.2, `handoff.md` version 0.2, `technical-design-proposal.md` version 0.1, `group3-storage-proposal.md`, and `implementation-T05.md`.
- **Implementation file reviewed:** `src/libconnect-mp4/test/LoginPage.integration.test.tsx`; relevant current React, Express, Firestore adapter, and T02–T04 tests/reviews were inspected as evidence dependencies.
- **Checklist:** T05 remains unchecked. This review does not change the checklist or grant merge approval.

## Checkout and scope limits

The implementation and test files are uncommitted, and the shared worktree contains unrelated UI, package, workflow, planning, and evidence changes. `.git` is read-only for this review, so a separate worktree, clean checkout, and reliable tracked before/after diff were unavailable. The T05 test is untracked in the shared worktree. Compensating controls: I read the approved scope and handoff, reviewed the complete T05 test and its production dependencies directly, inspected existing T02–T04 test and review evidence, checked `git status --short`, and independently ran the focused integration suite, full configured suite, and build. I did not modify production code, tests, or checklist. Attribution beyond the named T05 test relies on the implementation handoff and current workspace state.

## Findings

No T05-specific correctness or security finding requiring code changes was identified.

### Follow-up limits

- **Medium — Firestore behavior is not independently validated against an emulator or live instance.** The new integration test injects an in-memory repository and auth store. Existing T03/T04 evidence tests Firestore adapter behavior with synthetic fixtures and records the corrected session expiry and CSRF transaction paths, but does not establish actual Firestore durability, SDK transaction retry/concurrency behavior, or cross-process sharing. Keep this as a separately gated integration risk; do not treat the synthetic adapter as live-store proof.
- **Medium — Rules, IAM, and deployment remain outside verified T05 scope.** Source inspection shows the browser login module does not read Firestore account records or password hashes, and the server uses an injected repository boundary. Browser Firestore rules, least-privilege deployed IAM, trusted proxy configuration, HTTPS cookie behavior, and `/api` deployment routing were not independently verified or changed.
- **Low — Registration and email-change collision behavior remains unverified.** The login endpoint tests canonical lookup and fails closed for inconsistent mappings. Registration/email-change canonical collision handling and existing-account migration are explicitly out of scope and have no verified implementation evidence here.
- **Workflow follow-up — shared worktree ownership remains unreconciled.** The broad dirty state includes files beyond T05. The orchestrator should reconcile ownership before any whole-worktree merge decision.

## Acceptance scenario traceability

| Scenario | Evidence reviewed | Result and evidence level |
| --- | --- | --- |
| 1. Both fields blank produce both field errors and no request | `test/LoginPage.test.tsx` | Pass; direct React component test. |
| 2. Whitespace-only email or password produces its field error and no request | `test/LoginPage.test.tsx` | Pass; direct React component test. |
| 3. One request sends entered email, exact password, and selected type | `test/LoginPage.test.tsx`; T05 integration test asserts the real component request body and one call | Pass; component plus direct React-to-Express evidence. Browser `type=email` sanitizes some email whitespace, while server canonicalization is covered directly in T03 tests. |
| 4. Active Member with matching password is accepted | `test/login.session.test.js`; T03 credential tests | Pass at endpoint level. T05 does not separately exercise a React Member-success path. |
| 5. Active Librarian with matching password is accepted | T05 integration success case; `test/login.session.test.js` | Pass; direct React-to-Express evidence for Librarian and endpoint evidence for both account types. |
| 6. Unknown email or wrong password yields denial and no authenticated state | T05 integration cases; T03/T04 endpoint tests | Pass; direct UI-to-endpoint denial for unknown and wrong password, endpoint evidence for no cookie/session and uniform response. |
| 7. Both selected-type mismatch directions are generic denials | T05 integration case for Member selected as Librarian; `test/login.session.test.js` both directions | Pass; direct integration for one direction and endpoint tests for both. |
| 8. Inactive account is denied without a session | `test/login.session.test.js`; `test/login.credentials.test.js` | Pass at endpoint level; inactive denial is not repeated through React in T05. |
| 9. Forged role, manager, status, user ID, or hash cannot authorize | T04 endpoint test sends forged values; T03 validation and record tests | Pass at endpoint/source level; not repeated through React, which submits only the specified three fields. |
| 10. Malformed input or service outage fails closed without sensitive output | `test/login.credentials.test.js`; T05 repository-failure UI case; login route source | Pass for synthetic service failure and malformed requests. T05 verifies generic UI 503, no session, and no console output. Real Firestore outage/logging remains unverified. |
| 11. Email canonicalization and inconsistent mappings fail closed; registration collision rejected | `test/login.credentials.test.js`; login route source | Login canonicalization and inconsistent mapping pass at endpoint level. Registration/email-change collision and migration behavior are out of scope and unverified. |
| 12. Unknown email uses dummy hash and same 401 status/body | `test/login.credentials.test.js`; `test/login.session.test.js` | Pass; direct endpoint test validates Argon2id dummy verification and uniform denial. |
| 13. Success returns minimal type and protected cookie; UI uses server type | T05 integration success case; T04 session tests; `src/LoginPage.tsx` | Pass; direct React-to-Express evidence verifies server-returned Librarian state, response shape, cookie attributes, and protected session read. Endpoint tests cover minimal response and both types. |
| 14. Idle/absolute expiry, logout, role/status recheck, and CSRF | T05 integration lifecycle case; `test/login.session.test.js`; `test/firestore-store-T04.test.js`; T04 review re-review addendum | Pass in synthetic endpoint/adapter evidence, including expiry, recheck, CSRF logout, and reviewed fixes to stale expiry/CSRF transaction findings. Actual Firestore concurrency remains unverified. |
| 15. Both rate thresholds return generic 429 without session or lockout | T05 integration suite exercises five canonical-email failures and 30 direct-source failures; `test/login.session.test.js` | Pass for sequential synthetic behavior. T05 also confirms changing `X-Forwarded-For` does not evade the direct-source test limit; account status remains active in endpoint evidence. Actual shared Firestore counter behavior under contention remains unverified. |

## Security and integration matrix

| Area | Evidence and assessment |
| --- | --- |
| Client/server trust boundary | The UI sends only email, password, and selected type. Endpoint code uses repository-sourced account type/status and validates those against the selected context before session creation. T04 forged-field tests provide direct endpoint evidence. |
| Response minimization | T05 checks `{ accountType: 'LIBRARIAN' }`, protected cookie properties, and a session record with only expected fields. T03/T04 tests also check minimal success and generic denial/failure shapes. No password hash or email is present in the session record asserted by T05. |
| Session lifecycle and CSRF | T05 uses the server-issued cookie for protected session and CSRF calls, verifies missing-CSRF rejection, valid logout, cookie clearing, and invalidated-session rejection. It manually supplies the Secure cookie to the local HTTP test agent. T04 synthetic adapter review supplies the expiry and role/status recheck evidence. |
| Failure behavior and logging | T05 repository failure renders generic retry text, creates no session, and records zero calls to `console.log/info/warn/error`. The inspected login routes return static errors and contain no credential logging. Actual Firestore SDK/deployment logging is unverified. |
| Rate controls | T05 and T04 use isolated synthetic stores for both approved thresholds, generic 429, no session, and no account lockout. Forwarded headers are ignored in the direct-source fixture. Firestore shared-counter contention is unverified. |
| Browser database access | The inspected login UI has no Firestore imports or account/hash reads. This is source-inspection evidence only; Firestore Security Rules were not reviewed or deployed in T05 and remain a separate approval gate. |
| Secrets and test fixtures | The new test uses `.test` addresses and synthetic passphrases, computes Argon2id hashes in memory, and does not persist real session values or hash output. No raw sensitive values were copied into the report or execution log. Existing debug log files in the shared worktree were not opened. |

## Verification

Inspected `src/libconnect-mp4/package.json` before running scripts. From `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --runInBand test/LoginPage.integration.test.tsx` — passed, 1 suite and 7 tests.
- `npm test -- --watchAll=false --runInBand` — passed, 6 suites and 61 tests.
- `npm run build` — passed; optimized production build compiled successfully.

The test process emitted the Node `punycode` deprecation warning. The build emitted the Node `fs.F_OK` deprecation warning. Neither command failed. No external service, Firebase project, emulator, credential, or destructive action was accessed.

## Verdict

**Pass with follow-up.** T05's React-to-Express integration evidence and the existing component/endpoint/adapter suites cover all in-scope login scenarios at an appropriate test layer, with the evidence-level distinctions and external integration limits above. No T05 code correction is requested. Before merge consideration, the orchestrator should reconcile shared-worktree ownership and retain the separately gated Firestore, rules/IAM, deployment, and registration/migration risks. This review does not mark T05 complete or approve a merge.
