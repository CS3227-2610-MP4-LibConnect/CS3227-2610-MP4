# T02 exception/control statement filter follow-up evidence

Status: Corrected and verified; ready for independent review.

- Scope: Student-only output filter and assigned fake-provider feature tests. No T03/auth implementation or tests were changed.
- Findings addressed: added a general leading-statement detector for exception and neighboring control statements, including `throw`, `raise`, `break`, `continue`, `pass`, `assert`, exception handlers, and common branch/loop markers. This supplements the existing representative JS/Python/SQL matrix rather than special-casing only the two review strings.
- Registered fake-provider rejection cases include `throw new Error("bad")`, `raise ValueError("bad")`, `break`, `continue`, `pass`, `assert`, `catch`, and `except` forms.
- Registered fake-provider acceptance cases include ordinary explanatory prose about throwing/raising exceptions, break statements, return values, awaiting, imports, function notation, and complexity notation.
- Files: `src/codeclinic/server/ai/student-ticket-help.js`, `src/codeclinic/test/student-ticket-help.feature.test.js`.
- Verification: focused feature/gateway suites passed, 2 suites / 72 tests. The initial test attempt found an invalid regex character class; it was corrected before the passing run. Exact command/results are in `logs/tasks/ai-error-explainer/implementation-T02-followup-5.md`.
- Residual risk: the filter is bounded statement-shape detection, not a language parser; ambiguous lowercase prose beginning with statement keywords may be rejected, and unrecognized or semantically phrased solution content can still pass. The approved manual adversarial review remains required. No provider, credential, network, rate-limit, deployment, or TA-specific access occurred.
