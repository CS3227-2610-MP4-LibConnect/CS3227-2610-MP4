# Inactive Student chat status resolution proposal

Status: **recommended resolution approved by the human** in this conversation, with an express instruction not to execute implementation. The alternative shared authentication change was not approved.

The approved chatbot specification v0.3 R2 says inactive accounts receive HTTP 403. The existing shared `createSessionAuthenticator` treats an inactive account as an invalid session, deletes that session, and returns `null`. The Student create-chat route consequently returns the same safe `UNAUTHENTICATED`/401 envelope used for an absent session. Independent Batch 2 correction review confirmed the mismatch; its negative test confirmed no provider call or protected context exposure. This is not a permission bypass.

## Recommended resolution

Approve a narrow specification amendment: for a session rejected by the shared authenticator because the account is inactive, the chat route returns 401. Retain 403 for an authenticated but ineligible role, password-change restriction, or CSRF failure. Keep the shared authenticator and Student route authorization behavior unchanged. Update the approved spec, checklist/handoff acceptance references, and T03 negative test expectation consistently before marking T03 complete. Preserve prior review and test evidence. This keeps the task within Student feature scope and does not expose account status to callers whose session has been invalidated.

## Alternative requiring broader approval

Keep R2's 403 inactive-status rule and authorize a shared authentication contract change so the Student chat route can distinguish an invalidated inactive account from no session. This expands beyond the approved Student-only correction and requires a security design, exact file allowlist, implementation tests, and independent review before use. It should not be inferred from the current batch approval.

The specification was amended to v0.4. The human subsequently approved the aligned checklist and handoff v0.3, then explicitly authorized implementation to resume. This status amendment itself changed no production or test code. Batch 2 T03 and the combined verdict remain open until independent review.
