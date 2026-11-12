# T03 correction evidence

Status: Follow-up tests added; create-route tests pass. One R2 status-code discrepancy remains for orchestrator review.

- Controlling artifacts: spec v0.3, checklist/handoff v0.2, approved `batch-2-correction-proposal.md`.
- Changes: added create-route tests for TA and password-change-required denial, inactive-account denial, forged client identity/role fields, and exact draft/body boundaries: 255 Unicode code points in title, 5,000-code-point text fields, three 24 KiB files, ten paths, and a valid serialized request above 100 KiB but below 128 KiB.
- Files changed for this follow-up: `src/codeclinic/test/student-help-chat.api.test.js`.
- Verification: 14 create-route assertions pass. Six failures remain in the same suite, all on detail-chat paths assigned to T04; preserved as required. Exact output and the corrected initial boundary-test setup are recorded in the log.
- Unresolved R2 finding: inactive Student account is denied before provider work, but existing `createSessionAuthenticator` returns no session for inactive accounts; the endpoint responds `UNAUTHENTICATED`/401. R2 specifies 403 for inactive status. Correction scope required retaining T03 implementation, so this mismatch is reported for orchestration and any further approval decision.
- No TA-specific files/tests, provider, credentials, network, deployment, or rate-limit behavior were changed.
