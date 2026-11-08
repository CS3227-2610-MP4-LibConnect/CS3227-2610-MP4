# Account management security review — continuation

Status: implementer security self-check; independent review is still required. Specification: `workflow/specs/account-management.md` v0.1.

## Controls checked

- Actor identity and active role are reloaded from the authenticated session and stored account. Support targets are loaded by the server before the stored account type and Coordinator privilege are checked.
- Every state-changing account endpoint runs the existing timing-safe CSRF guard. Client-supplied role, manager, identity, password-hash, and registration fields are rejected by strict field allow-lists.
- Profile name and email are bounded and validated using the registration constraints. Email key movement delegates to the AM-G1 transaction; collisions make no partial writes.
- Password changes verify the current Argon2id hash. Failed current-password attempts reserve the existing email failure-counter slot. Successful changes hash the new password and keep only the current session.
- Support deactivation and reset use AM-G1 transactional session deletion. Reset uses `crypto.randomInt`, stores only the Argon2id hash, returns the plaintext once with `Cache-Control: no-store`, and does not log it.
- The R7 middleware is installed in the shared login app before downstream account and notification routers. It allows only the specified session, CSRF, logout, and password-change paths for temporary-password sessions.
- Bootstrap input is an environment value; its output is generic and contains no email, credential, or account record. It requires an explicit project and checks for an existing Coordinator and a stored TA target.
- Temporary-password display is held only in component memory; the UI asks for confirmation before deactivation and reset.

## Unresolved verification

- The local Jest environment denies Supertest listener creation with `listen EPERM`; endpoint tests therefore require the orchestrator's integrated run. The orchestrator reports that its full run exposed unrelated fixtures needing approved updates. Check the final exact run before independent review.
- No Firestore emulator transaction run was performed in this continuation. AM-G1's prior review notes that its transaction/query behavior was covered by fakes, not the emulator.
- The bootstrap utility was tested against fakes only and was not run against any Firebase project.
