# Proposed account management guide text

## User Guide additions

### Manage your account

Choose **Account** from your dashboard to update your name or email address. Changing your email requires your current password. Choose **Change password** to enter your current password and a new password of at least eight characters. Your current session stays active after a successful password change; other sessions end.

### TA account support

TAs can open **Students** to view student accounts, activate or deactivate them, and issue temporary passwords. Deactivation and password reset require confirmation. A reset signs the student out of all sessions and shows the temporary password once. Copy it before closing the page, then share it with the student outside CodeClinic. The student must change it after signing in.

TA Coordinators have the same student support tools and can also open **TAs** to manage other TA accounts. A Coordinator cannot change their own TA status or reset their own password through this support page.

### Temporary passwords

When you sign in with a temporary password, CodeClinic takes you to the password-change page. Enter the temporary password and choose a new password before using other pages. A temporary password is shown only in the reset response and is not available again after leaving the page.

## Developer Guide additions

### Account API and authorization

The account router is mounted at `/api`. It provides `GET /api/account`, `PATCH /api/account/profile`, `POST /api/account/password`, `GET /api/support/accounts?type=STUDENT|TA`, `POST /api/support/accounts/:userId/status`, and `POST /api/support/accounts/:userId/password-reset`. All mutations require the session's current CSRF token. The server derives the actor from the session and stored account; it loads each support target and authorizes by stored account type and Coordinator flag. Request fields cannot set account type, manager privilege, identity fields, hashes, or registration time.

Changing an email moves the canonical `emailKeys` entry and updates the user record in one Firestore transaction. Password changes store a fresh Argon2id hash, keep only the current session, and clear the temporary-password flag. Deactivation deletes the target's sessions in the same transaction as the status change. Password reset generates a 16-character temporary password from an unambiguous alphabet using `crypto.randomInt`, stores only its Argon2id hash, deletes all target sessions, and returns the password once with `Cache-Control: no-store`.

Accounts marked `mustChangePassword` can access only `GET /api/auth/session`, `GET /api/auth/csrf`, `POST /api/auth/logout`, and `POST /api/account/password`. Other API paths return `403` with `PASSWORD_CHANGE_REQUIRED`. The frontend routes these sessions to `/account/password-change` until the new password is saved.

### First TA Coordinator bootstrap

The bootstrap utility is `src/codeclinic/scripts/bootstrap-coordinator.js`. A human with credentials for the intended Firebase project runs it from `src/codeclinic/` in a terminal. Set `CODECLINIC_COORDINATOR_EMAIL` to the existing TA's email without putting it in source control or command history, then provide an explicit project ID:

```sh
read -r -s -p "TA email: " CODECLINIC_COORDINATOR_EMAIL
printf '\n'
export CODECLINIC_COORDINATOR_EMAIL
node scripts/bootstrap-coordinator.js --project <explicit-project-id>
unset CODECLINIC_COORDINATOR_EMAIL
```

The script refuses to proceed if no project is supplied, if the email does not resolve to an existing TA, or if a TA Coordinator already exists. `--allow-additional` is required to add another Coordinator. It prints a generic outcome only; it does not print the email, credentials, password, or account record. Never expose the script over HTTP or run it in an automated deployment step. Use the appropriate configured credentials and target environment deliberately.
