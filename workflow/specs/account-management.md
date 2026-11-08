# Account management specification

Version: 0.1 (2026-11-08)
Approval evidence: the human replied "approved" to version 0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.
Task ID: `account-management` (from approved `workflow/PLAN.md` v0.1)

## Purpose and scope

Let every user update their own account details. Let TAs support student
accounts, and TA Coordinators support TA accounts. Provide the documented
bootstrap for the first TA Coordinator.

In scope:

- Self-service updates to name, email, and password.
- TA support for students: list, activate, deactivate, and temporary password
  reset.
- TA Coordinator support for TAs: the same actions.
- First-Coordinator bootstrap script.

Out of scope: AI features, account deletion, email delivery, and changes to
the registration or login rules other than R7.

## Sources

- `Overview.md` (approved 2026-11-08): account-management stories for Students,
  TAs, and TA Coordinators. `isManager` is server-controlled. The first TA
  Coordinator is provisioned through a documented bootstrap procedure.
- `account-registration` v0.7: the record shape, canonical email keys,
  Argon2id parameters, the email format rule (R9), and password limits.
- `role-aware-login` v0.3: sessions, CSRF on state-changing requests, and
  rechecking status and role on every protected request.
- `environments-and-deployment` v0.3, open decision 5: TA accounts cannot be
  activated in production until a bootstrap exists.

## Actors, data, and trust boundaries

- **Student** and **TA:** an active, authenticated user acting on their own
  account.
- **TA:** may act on Student accounts only.
- **TA Coordinator:** a TA whose stored `isManager` is `true`. May act on TA
  accounts other than their own.
- **Trusted:** the server session and the stored account record. A target
  `userId` in a request is untrusted until the server loads that record and
  checks its type.
- No request may set `accountType`, `isManager`, `studentId`, `employeeId`,
  `passwordHash`, or `registrationDateTime`.

## Requirements

### R1. Endpoints and common rules

| Method and path | Actor | Purpose |
| --- | --- | --- |
| `GET /api/account` | Any user | Own name, email, account type |
| `PATCH /api/account/profile` | Any user | Change own name and/or email |
| `POST /api/account/password` | Any user | Change own password |
| `GET /api/support/accounts?type=STUDENT\|TA` | TA (STUDENT), Coordinator (TA) | List accounts of the allowed type |
| `POST /api/support/accounts/:userId/status` | Same | Set `ACTIVE` or `INACTIVE` |
| `POST /api/support/accounts/:userId/password-reset` | Same | Issue a temporary password |

Every endpoint MUST:

- authenticate the session and recheck the actor's active status and role, as
  in role-aware-login R6;
- require the CSRF token on every state-changing request;
- accept only bounded JSON with the listed fields;
- return `400` for invalid input, `401` for no valid session, `403` for a
  forbidden actor or target, `404` for a missing target, `409` for an email
  collision, and `503` for storage failures, all with non-sensitive messages.

List responses contain only `userId`, `name`, `email`, `accountType`,
`accountStatus`, and `registrationDateTime`. They are paginated, at most 50
per page.

### R2. Profile update

- **Name:** follows the registration name rules.
- **Email:** follows registration R9 and canonicalization. Changing the email
  MUST, in one Firestore transaction, create the new `emailKeys` entry, delete
  the old one, and update the user record. A canonical collision with another
  account returns `409` and changes nothing.
- **Current password:** an email change requires the current password.

### R3. Password change

The user submits the current password and a new password. The new password
follows the registration password rules.

- A wrong current password returns `401`, counts toward the login failure rate
  limit for that email key, and changes nothing.
- On success, the server stores a fresh Argon2id hash, deletes every other
  session of that user, keeps the current session, and clears
  `mustChangePassword`.

### R4. Support authorization

- A TA may act only on targets whose stored `accountType` is `STUDENT`.
- A TA Coordinator may also act on targets whose stored `accountType` is `TA`,
  but never on their own account.
- No support action may change `accountType` or `isManager`.
- Any other combination returns `403` and changes nothing.

### R5. Status change

Setting a target to `INACTIVE` MUST delete all of the target's sessions in the
same operation. Setting `ACTIVE` changes only the status. Repeating the current
status succeeds without changes.

### R6. Temporary password reset

The server generates a random temporary password: 16 characters from an
unambiguous alphabet, from a cryptographically secure source. It then:

- stores its Argon2id hash and sets `mustChangePassword: true`;
- deletes all of the target's sessions;
- returns the temporary password once in the response, with
  `Cache-Control: no-store`.

The temporary password is never logged or stored in plain text. The supporting
user passes it to the account owner outside the app.

### R7. Forced password change

A login with `mustChangePassword: true` succeeds, but the session is limited.
Only `GET /api/auth/session`, `POST /api/account/password`, `GET /api/auth/csrf`,
and logout are allowed; every other protected request returns `403` with code
`PASSWORD_CHANGE_REQUIRED`. The UI shows a password-change page until the
change succeeds.

### R8. First TA Coordinator bootstrap

`scripts/bootstrap-coordinator.js` promotes one existing **TA** account to
`isManager: true` and `ACTIVE`, identified by email.

- It runs only by a human with project credentials, from a terminal, and is
  never exposed over HTTP.
- It requires an explicit `--project` value. It refuses to run if any TA
  Coordinator already exists, unless `--allow-additional` is given.
- It prints only the outcome, never credentials or the email address in full.

### R9. User interface

Each dashboard gets an **Account** page for R2 and R3.

- The TA dashboard gets a **Students** page with the R1 list and actions.
- A TA Coordinator also gets a **TAs** page.
- Deactivation and password reset ask for confirmation first.
- The temporary password is shown once, with a copy button and a note that it
  will not be shown again.
- Pages follow the shared theme.

## Acceptance scenarios

1. A user changes their name, and a later `GET /api/account` shows it.
2. An email change with the correct current password moves the email key
   atomically. Login works with the new email and fails with the old one.
3. An email change to an address another account uses returns `409`, and both
   records are unchanged.
4. A password change with a wrong current password returns `401` and counts
   toward the rate limit. With the right password it succeeds, and the user's
   other sessions stop working.
5. A TA lists and deactivates a Student, and the Student's existing session is
   rejected on its next request.
6. A TA acting on a TA, a Student acting on anyone, and a Coordinator acting on
   themselves or on a Student all get `403`.
7. A forged `accountType`, `isManager`, or role field in any request has no
   effect.
8. A password reset returns a temporary password once. The target's sessions
   end, and the target's next login gets only the R7 password-change access
   until they change it.
9. Responses, logs, and evidence never contain password hashes, temporary
   passwords (outside the one reset response), or session IDs.
10. The bootstrap promotes one TA, refuses a second run without
    `--allow-additional`, and refuses a non-TA account.
11. State-changing requests without a valid CSRF token are rejected.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Server | Endpoint tests for every status code, the authorization matrix, transactions, session deletion, the rate-limit interaction, and redaction |
| UI | Account, Students, and TAs pages; confirmations; one-time password display; forced password-change flow |
| Script | Bootstrap tests against the emulator, covering the refusal cases |
| Security | Forged fields, cross-role attempts, CSRF, no sensitive data in output |

## Open decisions

1. **Coordinators as TAs (resolved 2026-11-08):** yes. A TA Coordinator also has
   every TA power over Students.
2. **Temporary password length (resolved 2026-11-08):** 16 characters.

## Amendments

- 2026-11-08: Drafted at the human's direction.
- 2026-11-08: The human approved version 0.1 and resolved both open decisions: Coordinators keep every TA power over Students, and temporary passwords are 16 characters.
