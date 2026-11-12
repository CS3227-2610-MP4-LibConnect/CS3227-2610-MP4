# Batch 2 correction proposal

Status: **APPROVED**. The human explicitly replied “approved” to the Batch 2 correction scope request in this conversation. This approves the narrow allowlist expansion and correction dispatch below; it does not approve merge or provider access.
Approved requirement remains specification v0.3. Independent review `review-T02-T03.md` found T02 changes required and T03 pass with follow-up. The original report and test failures remain evidence.

## Narrow scope addition

Add `src/codeclinic/server/ai/parse.js` and `src/codeclinic/server/ai/gateway.js` to the Batch 2 correction allowlist, solely to pass raw model content and trusted server request context to the registered Student output validator. Keep current parsing behavior for all other registered features. Do not inspect or edit TA-specific source or tests. No provider, credential, network, rate-limit, or deployment access is included.

The Student feature parser will reject a fenced or otherwise wrapped raw response before returning a validated JSON variant. It will use the trusted `input.page` supplied by the server to reject `REFINEMENT` for detail chat. Add fake-provider Student integration tests for both rejection cases, complete-context overflow without a provider call, and representative adversarial code-shaped output. Strengthen deterministic checks where the examples expose a gap, retaining the spec's manual adversarial check because semantic leakage cannot be proven by a filter.

Keep T03's passed implementation intact; add focused Student create-route negative and boundary tests where practical within the existing `student-help-chat.api.test.js` allowlist. Preserve the six pre-existing T04 detail-route failures.

## Dispatch and review

The same implementer would correct T02 first, verify and append correction evidence, then add T03 follow-up tests. A different reviewer would independently review each item and the combined correction, with new report/log artifacts. Do not mark T02 complete or start Batch 3 until this correction passes review and is reconciled. This proposal changes the Batch 2 file scope only; it does not change the approved product requirements or TA functionality.
