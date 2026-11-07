# Account registration commit and merge preparation

Date: 2026-11-07  
Current branch: `login-and-registration`  
Status: T01–T07 independently reviewed; human approved the proposed commit message and listed files on 2026-11-07; exact-commit review and merge decision pending

## Proposed registration commit

Subject: `Registration: Add member and librarian accounts`

Body:

```text
LibConnect has a login page but no way to create an account.

Add member and librarian registration backed by atomic Firestore user
and email-key writes. Keep members active and librarians inactive until
manager activation, then return users to login after visible success.

Use the local Firestore emulator for development and verify the deployed
Cloud Run project before using production Firestore. Proxy the React
development server to local Express.

Cover validation, privilege controls, target selection, and login with
synthetic and local emulator tests.

Validate registration email format in the form and Express before account
creation, and isolate Firestore target tests from local emulator settings.
```

The proposed commit contains these application and documentation paths:
`docs/DeveloperGuide.md`; `src/libconnect-mp4/README.md`, `package.json`,
`server/index.js`, `server/auth/firestore-registration.js`,
`server/auth/register.js`, `server/firestore-target.js`, `src/LoginPage.tsx`,
`src/RegistrationPage.tsx`, `src/index.tsx`, `test/server.test.js`,
`test/RegistrationNavigation.test.tsx`, `test/RegistrationPage.test.tsx`,
`test/firestore-mode.integration.test.js`, `test/firestore-target.test.js`,
`test/registration.api.test.js`, and `test/registration.endpoint.test.js`.
It also contains `workflow/specs/account-registration.md`,
`workflow/tasks/account-registration/`, and `logs/tasks/account-registration/`
as the required task evidence. Stage these paths explicitly. The untracked
`src/libconnect-mp4/.env`, any Firebase debug logs, and the separately modified
`src/libconnect-mp4/.gitignore` are outside this commit and must not be staged.
The user directly authorized production and development startup additions in
`docs/DeveloperGuide.md`; independent documentation review passed.
No commit, push, or merge has been performed.

## Review evidence and limitations

The independent reviewer concluded **pass with follow-up** for the registration
work in `review-report.md` and `security-review.md` after correction of a production
credential-source finding and the T06 test-isolation failure. The ordinary full
suite passed 230 tests after the latter correction; T07 targeted tests and the
build passed. An
earlier local emulator registration-to-login run passed, and the React proxy
was smoke-tested. The latest emulator rerun met the persisted source rate
limit; no shared test data was cleared.

Production credentials/IAM, Firestore rules, and deployed routing remain
unverified. The email syntax policy is now specified and implemented. The
reviewer also noted a display-only success marker that can survive a later
failed attempt; changing that behavior would need a separate decision.

`main` is behind the current branch by four existing commits concerning
login and agent configuration. A merge of this branch into `main` would
include those commits as well as this registration work. Any merge decision
must account for that broader branch history; registration-only commit
approval does not approve a merge or push.
