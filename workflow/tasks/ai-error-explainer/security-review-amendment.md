# Security review addendum: provisional AI budget

Date: 2026-11-11
Applies to proposed specification v0.3 and checklist v0.2; pending fresh human approval.

- The 98,304-code-unit cap is based on Student upload and request sizes. It does not establish that an undocumented provider context window can accept all bounded inputs. Provider errors must return safe unavailable output without raw bodies or prompts; compatibility remains an explicit pre-release human smoke criterion.
- The 1,024 output-token cap is likewise provisional. Fake-provider tests can verify the request value and output parser, while a separately authorized provider check must verify `max_tokens` support. No credential or provider access is authorized by this addendum.
- Complete-context overflow still fails closed before a provider call. Redaction precedes the cap check; no field, file, eligible reply, or prior turn is silently removed to fit it. The request/body validation and output-policy controls remain required.
- The shared gateway rate-limit default remains 40 calls/minute, below the human's stated 50/minute upper cap; no shared rate-limit implementation or TA feature/test change is in scope.
- Prior risks remain: redaction may miss arbitrary secrets, deterministic filtering cannot guarantee against semantic solution leakage, and human adversarial and visual verification is outstanding.
