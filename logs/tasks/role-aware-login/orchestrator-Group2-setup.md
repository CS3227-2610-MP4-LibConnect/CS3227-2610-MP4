# Group 2 setup

Date: 2026-11-05 (Asia/Singapore)  
Specification: `workflow/specs/role-aware-login.md` v0.2  
Checklist: `workflow/tasks/role-aware-login/tasks.md` v0.2, Group 2 T02 and T03

The human replied "implement" to the explicit request to implement Group 2, install `express`, `firebase-admin`, `argon2`, and development dependency `supertest`, and update the test script to discover `test/**/*.test.*`. This was treated as approval for those three actions only. No live Firebase access, Firestore rule, deployment, or Group 3 work was authorized.

Changes owned by the orchestrator: `src/libconnect-mp4/package.json` and `package-lock.json` for the four named packages and test discovery script. Installed versions: Express 5.3.0, Firebase Admin 14.5.0, Argon2 0.45.2, Supertest 7.3.1.

Commands from `src/libconnect-mp4/`:

- `npm install express firebase-admin argon2`: interrupted after no output for approximately 90 seconds in the restricted environment; no success claimed.
- `npm install --offline --no-audit --no-fund express firebase-admin argon2`: exited 1 because Argon2 was absent from the local npm cache.
- `npm install --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000 express firebase-admin argon2`: passed with escalated network access, adding the approved dependencies.
- `npm install --save-dev --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000 supertest`: passed with escalated network access.
- `npm test -- --watchAll=false --runInBand --listTests`: passed and listed `test/App.test.tsx`.
- `npm ls express firebase-admin argon2 supertest --depth=0`: passed and listed all four installed direct packages.
- `git diff --check`: passed; Git reported line-ending notices for previously changed UI files.

T02 and T03 were dispatched to separate implementers with disjoint source and test files. Neither may edit shared checklist or package files. The Firestore skill calls for live instance inspection before integration, but this task has no approval to contact a Firebase project; T03 uses only injected synthetic fixtures and records that limitation.
