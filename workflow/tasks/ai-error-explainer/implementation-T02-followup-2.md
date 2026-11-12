# T02 nested-call filter follow-up evidence

Status: Corrected and verified; ready for independent review.

- Scope: T02 Student-only output policy and fake-provider feature tests. No T03/auth implementation or tests were changed.
- Finding addressed: the prior filter missed nested call expressions such as `console.log(transform(value))`. Added a general nested call-expression detector instead of another method-specific case.
- Registered fake-gateway rejection cases now include nested forms `console.log(transform(value))` and `map(filter(items))`, alongside the prior simple calls, statements, loops, and assignments.
- Registered fake-gateway acceptance cases confirm natural-language notation `Use f(x) to describe the mapping.` and `The runtime is O(n).` remains valid.
- Files: `src/codeclinic/server/ai/student-ticket-help.js`, `src/codeclinic/test/student-ticket-help.feature.test.js`.
- Verification: 2 suites / 42 tests passed. Exact command/result in `logs/tasks/ai-error-explainer/implementation-T02-followup-2.md`.
- Residual risk: nested function notation in prose may be rejected because it is structurally indistinguishable from nested code calls under this deterministic filter. The tested simple math/prose forms remain accepted. This filter cannot prove semantic solution leakage impossible; manual adversarial review remains required.
