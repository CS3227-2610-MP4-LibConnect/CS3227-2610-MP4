# T02 lambda and SQL filter follow-up evidence

Status: Corrected and verified; ready for independent review.

- Scope: Student-only output-policy and fake-provider tests. No T03/auth implementation or tests were changed.
- Findings addressed: added bounded detection for Python lambda expressions and common SQL SELECT/FROM and mutation statement forms.
- Registered fake-gateway rejection cases include `lambda x: x + 1`, a two-argument lambda, `SELECT value FROM records`, lowercase SELECT with WHERE, DELETE, and INSERT. Earlier console, nested-call, loop, assignment, and control-statement cases remain covered.
- Registered fake-gateway acceptance cases preserve `f(x)`, `O(n)`, explanatory prose about lambda expressions, and the instruction `Select the value from the array, then compare it.`
- Files: `src/codeclinic/server/ai/student-ticket-help.js`, `src/codeclinic/test/student-ticket-help.feature.test.js`.
- Verification: 2 suites / 50 tests passed. Exact command and result are in `logs/tasks/ai-error-explainer/implementation-T02-followup-3.md`.
- Residual risk: syntax-shaped prose that is indistinguishable from a complete SQL statement may be rejected. Deterministic filters cannot detect every language or prove semantic solution leakage impossible; manual adversarial review remains required. No provider, credential, network, rate-limit, deployment, or TA-specific access occurred.
