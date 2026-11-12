# Dated amendment record: provisional AI budget

Date: 2026-11-11
Task: `ai-error-explainer`
Human decision: approved the proposed 98,304-character post-redaction input cap and 1,024 output-token cap; directed that the existing gateway default rate limit remain unchanged. Approval was given in this conversation after `amendment-proposal.md` was presented. This is approval to prepare amended artifacts, not fresh approval of their final wording or implementation dispatch.

## Prior approved state retained

- Specification v0.2 required feature caps “within confirmed provider limits” in R3 and retained the planning decision to set provider-safe caps using confirmed deployed-model limits.
- Checklist v0.1 T01 required a confirmed deployed model, provider-safe cap rationale, and a stop before T02 if limits could not be confirmed. T01 was left unchecked and partially worked under approved Batch 1.
- Checklist v0.1 T08 required combined Student and AI verification, independent adversarial review, and human visual checks, without a provider compatibility smoke requirement.
- Handoff v0.1 stated that exact deployed-model limits were unresolved and T01 needed a safe cap rationale before prompt implementation.
- Batch plan v0.1 placed T01 alone due to its then-open model-limit decision boundary. It was approved and Batch 1 was dispatched; T01 stopped partial. The original `design.md` and `implementation-T01.md` preserve the outcome and are not erased.

## Amendment scope

Prepare specification v0.3, checklist v0.2, handoff v0.2, and batch plan v0.2 using provisional caps and an explicit pre-release provider smoke gate. Keep the current shared gateway default of 40 requests/minute; no shared rate-limit or TA feature/test change. T01 remains unchecked until completed and independently reviewed under freshly approved artifacts. No provider access or credential use is authorized by this record.
