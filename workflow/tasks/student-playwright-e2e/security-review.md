# Security review: Student Playwright E2E

Date: 2026-11-13. Canonical spec v0.1; independent Batch 2 review. Verdict: **pass with follow-up**. No production authorization code changed.

The runner checks `CODECLINIC_FIRESTORE_MODE=local-emulator`, `CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, and any `GOOGLE_CLOUD_PROJECT` value before browser work. Its setup probes the local emulator and binds the app to loopback port 3100. An independent run used `firebase emulators:exec --only firestore --project demo-codeclinic`; it passed both Chromium cases and shut down the emulator. A missing-variable test exited 1 before discovery. There is no production URL fallback.

The ownership case uses normal registration and login in a separate browser context and cookie jar. It checks absence from the second Student's list and direct detail view, including all description fields and reply, while the owner retains access. The server route obtains the Student ID from the authenticated session; the store filters list results by `studentId` and checks ownership for detail reads. The test does not alter server roles, owner IDs, policy, data model, or transitions. It is browser-visible evidence, not a substitute for detailed malformed-input, forged-role, replay, or concurrency API tests already outside this task's browser scope.

Names, emails, ticket text, and passwords are generated per run. Password values and session material are not committed or deliberately logged. Playwright traces, screenshots, and video are off, and results/report directories are ignored. The factual E2E console log contains test names and runner output, not generated credentials. The emulator contained only disposable synthetic test data and was stopped after the review run.

Residual risk: a fresh `npm ci` against the normalized lockfile was not independently run. Local browser success does not establish production deployment or live authorization behavior. No security finding requires a product-code change on the reviewed evidence.
