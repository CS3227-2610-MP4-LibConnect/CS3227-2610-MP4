# Account registration commit and merge preparation

Date: 2026-11-07  
Current branch: `login-and-registration`  
Status: T01–T07 independently reviewed; registration commit `b02daecf58db8258f6c59a84473026fed97aea7f` created after human commit approval; exact-commit review passed with follow-up; review-evidence commit and human merge decision pending

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
The registration commit above was created with the human-approved message and
file list. No push or merge has been performed.

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

## Exact-commit review and evidence handoff

An independent reviewer inspected the exact registration commit and its
52-file path list, confirmed no `.env`, `.gitignore`, Firebase debug logs,
or credential paths were included, and verified no working-tree difference
in the committed application/specification/evidence paths. The ordinary
full Jest command passed 230 tests across 11 suites, and the build passed.
The verdict in `exact-commit-review.md` is **pass with follow-up**. Production
IAM/rules and deployment remain unverified; the opt-in emulator integration
was not repeated at this commit; Markdown hard line breaks trigger a cosmetic
`git diff --check` warning. No blocking finding was reported.

The exact-commit report and its execution log are currently uncommitted.
Proposed evidence-only commit subject: `Registration: Record exact commit review`.
Its file scope is `workflow/tasks/account-registration/exact-commit-review.md`,
`workflow/tasks/account-registration/execution_logs/reviewer-2026-11-07-exact-commit.md`,
this merge-preparation file, and `logs/tasks/account-registration/orchestrator-T07.md`.
That evidence commit needs separate human commit-message/file approval. The
subsequent merge decision is also a separate human gate; it does not authorize
push or deployment.
