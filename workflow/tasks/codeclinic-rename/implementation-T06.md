# Implementation report — codeclinic-rename T06

Status: complete, awaiting independent review. Not committed.

- Task: T06 — Move the email helpers into their own module (Group 2).
- Inputs: `tasks.md` v0.1 and `handoff.md` v0.1 (human-approved 2026-11-08);
  `workflow/specs/role-aware-login.md` v0.3 R4 (human-approved 2026-11-08);
  G2 dispatch under the standing approval in
  `logs/tasks/codeclinic-rename/integration-G1.md`.
- Skills: none beyond the implementer procedure (`openspec-apply` preflight with the `workflow/specs/` adapter).
- Execution log: `logs/tasks/codeclinic-rename/implement-T06.md`.

## Changed files (under `src/codeclinic/`)

- `server/auth/email.js` (new): `canonicalizeEmail` (trim + lowercase) and
  `emailKeyFor` (sha256 UTF-8 lowercase hex), moved verbatim.
- `server/auth/login.js`: definitions removed; imports them from `./email`.
  `crypto` stays (still used for sessions/CSRF).
- `server/auth/register.js`, `server/auth/firestore-registration.js`: import from `./email`.
- `test/login.credentials.test.js`, `test/login.session.test.js`,
  `test/firestore-mode.integration.test.js`: import lines only.
- `test/email.test.js` (new): canonicalization, key format, and re-export identity.

## Acceptance

- Behavior unchanged; existing email tests pass with only import-path changes (handoff T06 criterion): met — 266 passed, 1 skipped (emulator-gated), build compiles.

## Deviations and risks

- `login.js` still re-exports `canonicalizeEmail` and `emailKeyFor` because
  `test/LoginPage.integration.test.tsx` imports `emailKeyFor` from `login.js`,
  and React/`.tsx` files are outside T06 in this group. That test is unchanged.
  The re-export can be dropped once the `.tsx` import moves to `email.js` in a later task.
- The changed import in `firestore-mode.integration.test.js` was not exercised because
  that suite needs the Firestore emulator. The path was checked with `node -e`.
