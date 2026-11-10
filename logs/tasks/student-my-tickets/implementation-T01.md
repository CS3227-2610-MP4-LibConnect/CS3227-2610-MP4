Invocation: npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js
Working directory: src/codeclinic
Preflight: node src/workflow/validate-assignment.mjs workflow/tasks/student-my-tickets/assignment-batch-1.json plan — pass; openspec list --specs --json — root found, no specs; openspec status --change student-my-tickets --json — change not found (repository adapter limitation, accepted by orchestrator).


> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:34380) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/student-ticket-activity.contract.test.js
PASS test/student-my-tickets.contract.test.js

Test Suites: 2 passed, 2 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        7.932 s
Ran all test suites within paths "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

Exit code: 0


--- Human-approved T01 correction (2026-11-10) ---
Invocation: npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js
Working directory: src/codeclinic
Purpose: add synthetic two-Student owner-isolation regression coverage requested by independent review.


> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:36884) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/student-ticket-activity.contract.test.js
PASS test/student-my-tickets.contract.test.js

Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        8.431 s
Ran all test suites within paths "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

Correction run exit code: 0
