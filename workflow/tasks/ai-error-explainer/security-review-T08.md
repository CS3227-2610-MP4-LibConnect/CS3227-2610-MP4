# Security review: Batch 7 T08

Date: 2026-11-12  
Specification: `workflow/specs/ai-error-explainer.md` v0.6  
Scope: T08 assigned Student-only tests, combined Student UI/server/AI boundary, and synthetic adversarial review. No production edits or live provider calls.

## Review outcome

No new blocking security defect found in the reviewed T08 scope. Focused synthetic tests and source tracing support the existing authentication, ownership, eligible-reply, redaction, safe-error, and output-validation boundaries. This review is **pass with follow-up**, not a guarantee of model behavior.

## Boundary checks

- Server derives the actor from the authenticated session, checks active Student status, password-change state and CSRF, and does not use request-supplied user/role fields as authorization. The T08 detail CSRF assertion verifies ticket/reply reads and provider work do not occur after CSRF denial.
- Detail requests load through the owner-scoped store method. Replies are limited to the owner and currently assigned TA, account identifiers are removed before gateway input, and a mid-pagination assignment change fails closed. Cross-student access is non-identifying.
- Malformed JSON and the 128 KiB request limit fail before protected ticket reads. Gateway/storage errors return safe no-store envelopes without private error detail.
- Student chat context is serialized as untrusted data, redacted and capped before provider transport. Fake-provider assertions verify common synthetic email, GitHub token, AWS key, bearer token, and private-key values are absent across create and detail context.
- Provider output must match the fixed schema and current page policy; known complete-solution/code/patch-like forms fail closed. Student UI inserts output as text and has no write/apply path.
- No provider/network/credential use occurred. Tests use a synthetic invalid provider endpoint and injected fake transport only.

## Residual risks

- Semantic complete solutions expressed as ordinary prose may evade deterministic output filters. Existing pattern tests are examples, not proof of semantic safety.
- Secret redaction is pattern-based and cannot cover arbitrary unknown secrets.
- Provider compatibility for the provisional 98,304-character input and 1,024-token output caps remains unverified pending separate human authorization.
- The current shared workspace lacks a clean tracked T08 baseline, limiting exact diff assurance; no out-of-scope production edit was made during review.

The post-T10 human browser and screen-reader observations are recorded in `human-visual-verification.md`; this review accepts them as human-reported A9 evidence and does not claim an agent-run browser check.
