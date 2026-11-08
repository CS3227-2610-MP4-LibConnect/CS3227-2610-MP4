# Account tests with local listener permitted — 2026-11-08

Spec/checklist/handoff v0.1; production source still unchanged.
The initial test-writer sandbox run could not bind Supertest's loopback listener.
The orchestrator reran the approved local tests with sandbox restrictions lifted;
automatic approval review permitted the run. No external service was used.

Working directory: `src/codeclinic`.

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/account-routes.test.js test/account-guards.test.js test/account-r7-server.test.js
```

Result: exit 1; 1 suite failed, 2 passed; 2 tests failed, 60 passed (62 total).
`account-guards.test.js` and `account-r7-server.test.js` passed. The two route
failures were expected: missing CURRENT_PASSWORD_REQUIRED/field and missing
CURRENT_PASSWORD_INCORRECT/field in the unchanged current server responses.
The initial combined mismatch/exhaustion test aborts at the mismatch assertion,
so this run does not claim the later exhaustion assertion executed. Asked the
test writer to separate those tests for meaningful preimplementation evidence.

This resolves the local-listener environment limitation for this command;
it does not erase the original failed sandbox run or establish implementation
success. A future run after test revisions must be recorded separately.

## Rerun after separating mismatch and exhaustion cases

Ran the same command after the test writer split the two cases. Result: exit 1;
1 suite failed, 2 passed; 3 tests failed, 60 passed (63 total). All three failures
were the expected missing error contracts: CURRENT_PASSWORD_REQUIRED,
CURRENT_PASSWORD_INCORRECT and PASSWORD_ATTEMPTS_EXCEEDED. Guards and R7 passed
again. The exhaustion request now executes as its own test and reaches the
expected-code assertion. No local listener error occurred. Production source
was not modified between these preparation runs.
