
> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js test/student-tickets.api.test.js test/student-tickets.storage.test.js

(node:25488) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/student-tickets.api.test.js (8.018 s)
PASS test/student-ticket-activity.contract.test.js
PASS test/student-tickets.storage.test.js

Test Suites: 3 passed, 3 total
Tests:       89 passed, 89 total
Snapshots:   0 total
Time:        14.161 s
Ran all test suites within paths "test/student-ticket-activity.contract.test.js", "test/student-tickets.api.test.js", "test/student-tickets.storage.test.js".
