# Bug FAQ session-bound reference amendment proposal

Proposed: 2026-11-12, following the human's decision that FAQ references should be session-bound.
State: the human approved this amendment proposal on 2026-11-12. At proposal time, the v0.4 artifacts awaited fresh approvals. The human later approved those artifacts and Batch 1 dispatch on 2026-11-12; see the current-state index and orchestrator log.

## Decision recorded

The human chose session-bound FAQ references. A reference created by one authenticated session must not be usable from another session, including a second session belonging to the same Student. References and cursors expire naturally when that session ends or rotates.

## Proposed implementation contract

Use stateless authenticated encryption for every externally returned opaque Bug FAQ token: the result `faqRef`, search continuation cursor, and reply continuation cursor.

- Derive a per-session AES-256-GCM key from the server-authenticated session's existing `idHash` with HKDF-SHA-256 and a fixed, purpose-specific CodeClinic Bug FAQ context. Do not use a process-local random key or add a new configured secret.
- Bind each token to the authenticated Student and token purpose using authenticated associated data. Search tokens also bind the normalized search query and Title/Tags field. Reply cursors bind to the FAQ reference/ticket and reply-page purpose.
- Encrypt the internal ticket/reply boundary identifiers and other token payload with a fresh nonce. The returned base64url token must not expose decodable raw ticket or reply IDs. Validate length/shape before decrypting; reject authentication, session, Student, purpose, query, or reference mismatches safely.
- Reauthenticate every request and resolve tokens only with the current session's server-side `idHash`; continue to recheck the stored ticket status is exactly `RESOLVED` for every detail read.
- Do not write a reference mapping or persist reference state. No new Firestore collection/index, database write, secret configuration, or live deployment is introduced.

## Exact artifact updates after approval

1. Draft `workflow/specs/bug-faq.md` v0.4 with a dated amendment. Replace the underspecified opaque FAQ-reference and cursor requirements with the session-bound authenticated-encryption contract above. State that token reuse from another session is rejected even for the same Student, and tokens cease to work after session end/rotation. Preserve all existing v0.3 product behavior, including RESOLVED-only eligibility and the detail projection.
2. Draft `workflow/tasks/bug-faq/tasks.md` v0.4: update T01/T02 to implement and test token encryption, session/Student/purpose/query/reference binding, tamper rejection, and session rotation/logout invalidation. T03/T04 stay functionally unchanged except version references.
3. Draft `workflow/tasks/bug-faq/handoff.md` v0.4 with the token contract and no-new-persistence/config boundary; keep existing allowed code areas unless implementation discovery requires a separately approved scope change.
4. Reconcile the preimplementation contract tests and coverage report to test ciphertext opacity, same-session acceptance, different-session (including same Student) rejection, tampering, purpose/query/reference mismatch, and expired session behavior. Keep implementation-specific HKDF/AES tests in the relevant server test suite.
5. Revise the v0.3 batch plan to v0.4 and obtain fresh human approvals for the revised specification, checklist, handoff, batch plan, and Batch 1 dispatch. The existing v0.3 assignment manifest and dispatch do not authorize v0.4 implementation.

## Scope and gate notes

At proposal time, no production code, tests, schema, index, configuration, deployment, or approved artifact had been changed; T01 was blocked and T02 had not started. The human later approved the v0.4 artifacts and Batch 1 dispatch, and implementation/review status is tracked in `current-state.md`.
