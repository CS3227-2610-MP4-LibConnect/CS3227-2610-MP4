# Security review: ai-gateway Group 2 (T04, T05) and the M1 fix

Reviewer: independent `reviewer` agent (Cursor), as part of the single Wave 1 review. Specification v0.1. Main report: [`review-G2.md`](review-G2.md).

## Result

I found no Critical, High, or Medium security issues.

## Checks

- **Secret handling.** The API key appears only in the `Authorization` header that is built for each attempt. The module has no logging. Failure results carry only a category, the attempt count, and the HTTP status. Provider error bodies are cancelled without being read. Thrown `fetch` errors, which can contain URLs or causes, are discarded. The raw `usage` object and the 2xx body are returned as untrusted data, for `parse.js` and the T08 usage recording only.
- **Retry safety.** 400, 401, 403, other 4xx, and 1xx or 3xx statuses map to `UPSTREAM_CLIENT_ERROR` and are never retried. There is at most one retry. An unbounded or unparseable `Retry-After` cannot extend the delay beyond 5 s: values above 5 s mean no retry, and unparseable values are ignored.
- **Availability.** The breaker counts every failed logical call and does not reset its counter when it opens, so a failing call after 60 s reopens it immediately. This prevents a retry storm against a failing provider.
- **Output handling (R9).** Model output is treated only as JSON data. There is no `eval`, no rendering, and no repair call. Fence stripping is anchored, lazy, and linear in my probes. Anything other than one surrounding fence makes the content unparseable, which fails closed. Exceptions from the feature's `parse` map to `AI_INVALID_OUTPUT`.
- **Redaction (M1).** The typed annotation is bounded (a leading character plus up to 64 more), and the pattern has no nested quantifiers. A lookahead requires `=` but not `==` or `=>`. Adversarial inputs ran in linear time (test and reviewer probe). Untyped behaviour is unchanged.

## Residual risks

- L1: annotations containing a comma (`Map<String, String>`, `Dict[str, str]`) still leak the value after `=`. This is accepted as a best-effort limit. The User Guide warning from R6 remains required.
- L2: the default redirect following should be disabled with `redirect: 'error'`.
- L3: the size of a 2xx body is bounded only by the timeout.
- Prompt-injection effects on parsed output are checked by each feature's `parse`, which is outside this group.
